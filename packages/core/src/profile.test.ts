import { describe, expect, test } from 'vitest';
import { dayKey } from './economy';
import { descentDeps, lookup, partyDeps } from './testfixtures';
import { startRun, type DescentRun } from './descent';
import { STARTER_GLOAM, addXp, applyPulls, clearStage, crewFor, equipCard, expireBanners, firstKindling, grantGloam, isUnlocked, newProfile, normalizeProfile, ownedHeroes, partyUnits, recordBattle, recordEvent, setParty, settleDescent, spendGloam } from './profile';
import { tasksForDay, TASKS } from './tasks';
import type { PullResult } from './kindling';
import { RANK_UP_GLOAM } from './progression';

const now = Date.parse('2026-09-29T10:00:00Z');
const starters = ['wren', 'marisol'];
const mk = (): ReturnType<typeof newProfile> => newProfile(now, starters);


describe('a new profile', () => {
  test('starts with the starters, a party of them, and the starter Gloam', () => {
    const p = mk();
    expect(ownedHeroes(p)).toEqual(starters);
    expect(p.party).toEqual(starters);
    expect(p.gloam).toBe(STARTER_GLOAM);
    expect(p.rank).toBe(1);
  });

  test('survives a JSON round trip unchanged', () => {
    const p = mk();
    clearStage(p, { id: '0-1', firstClearGloam: 60, xp: 40 }, now);
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)), now, starters);
    expect(back).toEqual(p);
  });

  test('anything that is not a profile is rejected, and damaged ones are repaired', () => {
    expect(normalizeProfile(null, now, starters)).toBeNull();
    expect(normalizeProfile('hello', now, starters)).toBeNull();
    expect(normalizeProfile({ v: 99 }, now, starters)).toBeNull();
    const repaired = normalizeProfile({ v: 1, gloam: -50, rank: 'x', party: ['ghost'], collection: { heroes: { wren: { resonance: 9 } }, cards: {} }, settings: { battleSpeed: 7, textScale: 3 } }, now, starters)!;
    expect(repaired.gloam).toBe(0);
    expect(repaired.rank).toBe(1);
    expect(repaired.party).toEqual(['wren']);
    expect(repaired.collection.heroes['wren']!.resonance).toBe(5);
    expect(repaired.settings.battleSpeed).toBe(1);
    expect(repaired.settings.textScale).toBe(1);
  });
});

describe('Gloam', () => {
  test('is spent only when there is enough', () => {
    const p = mk();
    expect(spendGloam(p, 400, now)).toBe(true);
    expect(p.gloam).toBe(600);
    expect(spendGloam(p, 601, now)).toBe(false);
    expect(p.gloam).toBe(600);
    expect(spendGloam(p, -5, now)).toBe(false);
  });

  test('capped sources stop paying', () => {
    const p = mk();
    const before = p.gloam;
    expect(grantGloam(p, 'task', 500, now)).toBe(75);
    expect(p.gloam).toBe(before + 75);
  });
});

describe('the campaign', () => {
  test('a first clear pays Gloam, XP, and unlocks heroes into the party', () => {
    const p = mk();
    p.party = ['wren'];
    const r = clearStage(p, { id: '1-1', firstClearGloam: 100, xp: 40, unlocks: ['pip'] }, now);
    expect(r.first).toBe(true);
    expect(r.gloam).toBe(100);
    expect(r.unlocked).toEqual(['pip']);
    expect(p.collection.heroes['pip']).toEqual({ resonance: 1 });
    expect(p.party).toEqual(['wren', 'pip']);
    expect(r.ranksGained).toBe(1);
    expect(r.rankGloam).toBe(RANK_UP_GLOAM);
  });

  test('a repeat clear pays only a little XP', () => {
    const p = mk();
    clearStage(p, { id: '0-1', firstClearGloam: 60, xp: 40 }, now);
    const gloam = p.gloam;
    const r = clearStage(p, { id: '0-1', firstClearGloam: 60, xp: 40 }, now);
    expect(r.first).toBe(false);
    expect(r.gloam).toBe(0);
    expect(r.xp).toBe(10);
    expect(p.gloam).toBe(gloam);
    expect(p.progress.cleared['0-1']).toBe(2);
  });

  test('a full party does not grow past four', () => {
    const p = mk();
    p.party = ['wren', 'marisol', 'io', 'tamsin'];
    clearStage(p, { id: '1-1', firstClearGloam: 0, xp: 1, unlocks: ['pip'] }, now);
    expect(p.party).toHaveLength(4);
    expect(p.collection.heroes['pip']).toBeDefined();
  });

  test('Rank ups pay Gloam', () => {
    const p = mk();
    const before = p.gloam;
    const r = addXp(p, 40 + 60 + 5, now);
    expect(r.ranksGained).toBe(2);
    expect(p.rank).toBe(3);
    expect(p.xp).toBe(5);
    expect(p.gloam).toBe(before + 2 * RANK_UP_GLOAM);
  });
});

describe('Kindling results', () => {
  const pull = (item: string, n = 1): PullResult => ({ n, banner: 'standard', item, rarity: 5, featured: false, pity: 'none', viaGuarantee: false, sinceFive: 1 });

  test('the scripted first Kindling happens once and skips pity', () => {
    const p = mk();
    expect(firstKindling(p, 'io', now)).toBe(true);
    expect(p.collection.heroes['io']).toEqual({ resonance: 1 });
    expect(p.party).toContain('io');
    expect(p.kindling.totalPulls).toBe(0);
    expect(firstKindling(p, 'io', now)).toBe(false);
  });

  test('new items are added, duplicates rank up, maxed duplicates pay Gloam', () => {
    const p = mk();
    const outcomes = applyPulls(p, [pull('ysolde'), pull('ysolde', 2), pull('card.worn-lantern', 3)], lookup, now);
    expect(outcomes.map((o) => [o.isNew, o.resonance ?? o.copies])).toEqual([[true, 1], [false, 2], [true, 1]]);
    for (let i = 0; i < 3; i++) applyPulls(p, [pull('ysolde')], lookup, now);
    expect(p.collection.heroes['ysolde']!.resonance).toBe(5);
    const before = p.gloam;
    const [maxed] = applyPulls(p, [pull('ysolde')], lookup, now);
    expect(maxed!.gloam).toBe(250);
    expect(p.gloam).toBe(before + 250);
  });

  test('a new hero joins a party that has room', () => {
    const p = mk();
    applyPulls(p, [pull('ysolde')], lookup, now);
    expect(p.party).toEqual(['wren', 'marisol', 'ysolde']);
  });

  test('leftover spark from finished banners turns into Gloam', () => {
    const p = mk();
    p.kindling.spark['rateup-0'] = 40;
    p.kindling.spark['rateup-2'] = 10;
    const before = p.gloam;
    expect(expireBanners(p, 2, now)).toBe(40 * 50);
    expect(p.gloam).toBe(before + 2000);
    expect(p.kindling.spark['rateup-0']).toBeUndefined();
    expect(p.kindling.spark['rateup-2']).toBe(10);
    expect(p.lastCycle).toBe(2);
  });
});

describe('party and cards', () => {
  test('a party must be owned heroes, without repeats, at most four', () => {
    const p = mk();
    p.collection.heroes['io'] = { resonance: 1 };
    setParty(p, ['io', 'io', 'ghost', 'wren']);
    expect(p.party).toEqual(['io', 'wren']);
    expect(() => setParty(p, ['ghost'])).toThrow();
  });

  test('a card can be on one hero at a time and boosts stats', () => {
    const p = mk();
    p.collection.cards['card.worn-lantern'] = 1;
    equipCard(p, 'wren', 'card.worn-lantern');
    equipCard(p, 'marisol', 'card.worn-lantern');
    expect(p.equipped).toEqual({ marisol: 'card.worn-lantern' });
    expect(() => equipCard(p, 'wren', 'card.nope')).toThrow();
    expect(() => equipCard(p, 'ghost', null)).toThrow();
    const [wren, marisol] = partyUnits(p, ['wren', 'marisol'], partyDeps);
    expect(wren!.passives).toEqual([]);
    expect(marisol!.passives).toEqual([{ type: 'stat', stat: 'hp', pct: 0.06 }]);
    equipCard(p, 'marisol', null);
    expect(p.equipped).toEqual({});
  });

  test('more copies make a card stronger, and a Descent crew freezes the setup', () => {
    const p = mk();
    p.collection.cards['card.worn-lantern'] = 5;
    equipCard(p, 'wren', 'card.worn-lantern');
    const [wren] = partyUnits(p, ['wren'], partyDeps);
    expect(wren!.passives).toEqual([{ type: 'stat', stat: 'hp', pct: 0.12 }]);
    expect(crewFor(p, ['wren', 'marisol'])).toEqual([
      { hero: 'wren', resonance: 1, card: 'card.worn-lantern', copies: 5 },
      { hero: 'marisol', resonance: 1, card: null, copies: 0 },
    ]);
  });
});

describe('daily tasks', () => {
  test('everyone gets the same three distinct tasks for a day', () => {
    const a = tasksForDay('2026-09-29');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((t) => t.id)).size).toBe(3);
    expect(tasksForDay('2026-09-29')).toEqual(a);
    const seen = new Set<string>();
    for (let d = 1; d <= 20; d++) for (const t of tasksForDay(`2026-10-${String(d).padStart(2, '0')}`)) seen.add(t.id);
    expect(seen.size).toBe(TASKS.length);
  });

  test('progress completes a task once and pays Gloam', () => {
    const p = mk();
    const today = tasksForDay(dayKey(now))[0]!;
    const before = p.gloam;
    expect(recordEvent(p, today.event, today.goal - 1, now)).toEqual([]);
    const done = recordEvent(p, today.event, 5, now);
    expect(done.map((c) => c.task.id)).toEqual([today.id]);
    expect(done[0]!.gloam).toBe(25);
    expect(p.gloam).toBe(before + 25);
    expect(recordEvent(p, today.event, 99, now)).toEqual([]);
  });

  test('a new day starts fresh', () => {
    const p = mk();
    const today = tasksForDay(dayKey(now))[0]!;
    recordEvent(p, today.event, today.goal, now);
    const tomorrow = now + 86_400_000;
    recordEvent(p, 'wins', 0, tomorrow);
    expect(p.tasks.day).toBe(dayKey(tomorrow));
    expect(p.tasks.done).toEqual([]);
  });

  test('finished battles feed the tasks', () => {
    const p = mk();
    const wins = tasksForDay(dayKey(now)).find((t) => t.event === 'wins');
    const stats = { turns: 1, foeActions: 0, foeSkips: 0, breaks: 20, weakHits: 0, encores: 20, passes: 20, bursts: 5, ultimates: 20, crits: 0, kos: 0, partyKos: 0, damageDealt: 0, damageTaken: 0, healed: 0 };
    const done = recordBattle(p, stats, true, now);
    const ids = new Set(done.map((c) => c.task.id));
    for (const t of tasksForDay(dayKey(now))) {
      if (t.event !== 'descentFloors' && t.event !== 'wins') expect(ids.has(t.id), t.id).toBe(true);
    }
    expect(wins ? ids.has(wins.id) === (wins.goal <= 1) : true).toBe(true);
  });
});

describe('unlocking features', () => {
  test('Kindling, the roster and tasks open with the first Kindling; Descent after 1-2', () => {
    const p = mk();
    expect(isUnlocked(p, 'kindling')).toBe(false);
    expect(isUnlocked(p, 'descent')).toBe(false);
    firstKindling(p, 'io', now);
    expect(isUnlocked(p, 'kindling')).toBe(true);
    expect(isUnlocked(p, 'roster')).toBe(true);
    expect(isUnlocked(p, 'tasks')).toBe(true);
    expect(isUnlocked(p, 'descent')).toBe(false);
    clearStage(p, { id: '1-2', firstClearGloam: 0, xp: 1 }, now);
    expect(isUnlocked(p, 'descent')).toBe(true);
  });
});


describe('settling a Descent run', () => {
  const finished = (floors: number, cleared: boolean, daily: string | null): DescentRun => {
    const run = startRun({ seed: 's', daily, crew: crewFor(mk(), ['wren', 'marisol']), rank: 1, pools: descentDeps.pools }, descentDeps);
    run.stats = { battles: floors * 2, floorsCleared: floors, actions: 40 };
    run.phase = 'done';
    run.result = cleared ? 'cleared' : 'failed';
    return run;
  };

  test('floors and the clear pay Gloam, up to the weekly cap', () => {
    const p = mk();
    const before = p.gloam;
    const s = settleDescent(p, finished(3, true, null), now);
    expect(s.floorGloam).toBe(120);
    expect(s.clearGloam).toBe(60);
    expect(s.dailyGloam).toBe(0);
    expect(p.gloam).toBeGreaterThan(before + 179);
    for (let i = 0; i < 4; i++) settleDescent(p, finished(3, true, null), now);
    const capped = settleDescent(p, finished(3, true, null), now);
    expect(capped.floorGloam + capped.clearGloam).toBe(0);
  });

  test('a failed run pays only for the floors it cleared', () => {
    const p = mk();
    const s = settleDescent(p, finished(1, false, null), now);
    expect(s.floorGloam).toBe(40);
    expect(s.clearGloam).toBe(0);
    expect(p.descent.bestFloors).toBe(1);
    expect(p.descent.clears).toBe(0);
    expect(p.descent.run).toBeNull();
  });

  test('the daily bonus is paid once a day, and three days in a week pay the milestone', () => {
    const p = mk();
    const d1 = settleDescent(p, finished(3, true, '2026-09-29'), now);
    expect(d1.dailyGloam).toBe(120);
    expect(d1.weeklyGloam).toBe(0);
    expect(settleDescent(p, finished(3, true, '2026-09-29'), now).dailyGloam).toBe(0);
    const d2 = settleDescent(p, finished(3, true, '2026-09-30'), now + 86_400_000);
    expect(d2.dailyGloam).toBe(120);
    const d3 = settleDescent(p, finished(3, true, '2026-10-01'), now + 2 * 86_400_000);
    expect(d3.dailyGloam).toBe(120);
    expect(d3.weeklyGloam).toBe(300);
    const d4 = settleDescent(p, finished(3, true, '2026-10-02'), now + 3 * 86_400_000);
    expect(d4.weeklyGloam).toBe(0);
    // A new week can pay it again after three more days.
    const next = now + 7 * 86_400_000;
    settleDescent(p, finished(3, true, '2026-10-06'), next);
    settleDescent(p, finished(3, true, '2026-10-07'), next + 86_400_000);
    expect(settleDescent(p, finished(3, true, '2026-10-08'), next + 2 * 86_400_000).weeklyGloam).toBe(300);
  });

  test('a failed daily run does not count toward the daily bonus', () => {
    const p = mk();
    expect(settleDescent(p, finished(2, false, '2026-09-29'), now).dailyGloam).toBe(0);
    expect(p.descent.dailyClears).toEqual([]);
  });

  test('XP is awarded', () => {
    const p = mk();
    const s = settleDescent(p, finished(3, true, null), now);
    expect(s.xp).toBe(6 * 10 + 3 * 20);
    expect(s.ranksGained).toBeGreaterThan(0);
  });
});
