import { describe, expect, test } from 'vitest';
import { startClimb, type ClimbRun } from './climb';
import { dayKey } from './economy';
import type { PullResult } from './kindling';
import {
  ARCHIVE_SIZE,
  STARTER_GLOAM,
  addXp,
  applyPulls,
  archiveEcho,
  climbStart,
  dueBeats,
  expireBanners,
  firstKindling,
  grantGloam,
  isUnlocked,
  newProfile,
  normalizeProfile,
  ownedHeroes,
  recordEvent,
  recordFight,
  seeBeat,
  setHero,
  settleClimb,
  spendGloam,
  unlockedStrata,
} from './profile';
import { RANK_UP_GLOAM } from './progression';
import { TASKS, tasksForDay } from './tasks';
import { BEAT_DEFS, climbDeps, lookup } from './testfixtures';
import type { CardDef } from './cards/defs';

const now = Date.parse('2026-09-29T10:00:00Z');
const starters = ['wren', 'marisol'];
const mk = (): ReturnType<typeof newProfile> => newProfile(now, starters);

function finishedRun(o: { cleared: boolean; floors: number; battles: number; daily?: string | null; stratum?: number }): ClimbRun {
  const run = startClimb({ seed: 'r', daily: o.daily ?? null, stratum: o.stratum ?? 0, hero: 'wren', resonance: 1, rank: 1, kindled: {}, archive: [] }, climbDeps);
  run.phase = 'done';
  run.result = o.cleared ? 'cleared' : 'failed';
  run.stats.floorsCleared = o.floors;
  run.stats.battles = o.battles;
  run.stats.reachedFloor = Math.min(2, o.floors);
  return run;
}

const zeroStats = { turns: 3, cardsPlayed: 6, damageDealt: 30, damageTaken: 4, blocked: 6, heldWard: 12, held: 3, breaks: 2, kos: 2, maxChain: 2, chains: 1, ultimates: 1, healed: 0, plays: {}, kinds: {} };

describe('a new profile', () => {
  test('starts with the starters, the first one picked, and the starter Gloam', () => {
    const p = mk();
    expect(ownedHeroes(p)).toEqual(starters);
    expect(p.hero).toBe('wren');
    expect(p.gloam).toBe(STARTER_GLOAM);
    expect(p.rank).toBe(1);
    expect(p.v).toBe(2);
  });

  test('survives a JSON round trip unchanged', () => {
    const p = mk();
    archiveEcho(p, echo('echo:a'));
    p.climb.run = startClimb(climbStart(p, { seed: 's', daily: null, stratum: 0 }), climbDeps);
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)), now, starters);
    expect(back).toEqual(p);
  });

  test('rejects things that are not profiles', () => {
    expect(normalizeProfile(null, now, starters)).toBeNull();
    expect(normalizeProfile({ v: 99 }, now, starters)).toBeNull();
    expect(normalizeProfile('hello', now, starters)).toBeNull();
  });
});

describe('carrying a version 1 save forward', () => {
  const v1 = {
    v: 1,
    createdAt: now - 1000,
    updatedAt: now,
    name: 'Ash',
    rank: 7,
    xp: 12,
    gloam: 2345,
    collection: { heroes: { wren: { resonance: 2 }, marisol: { resonance: 1 }, io: { resonance: 1 } }, cards: { 'card.key': 2 } },
    party: ['io', 'wren'],
    equipped: { io: 'card.key' },
    kindling: { pity: { featured: { five: 12, four: 3, guaranteed: true } }, spark: { 'rateup-0': 40 }, history: [], totalPulls: 40 },
    lastCycle: 0,
    progress: { cleared: { '0-1': 1, '0-2': 1 }, flags: { firstKindling: true, seenPrologue: true } },
    ledger: { day: '2026-09-29', week: '2026-W40', daily: { task: 25, descentDaily: 120 }, weekly: { descentFloor: 80 } },
    tasks: { day: '2026-09-29', progress: { 'pass-2': 1 }, done: [] },
    descent: { run: { v: 1 }, clears: 2, bestFloors: 3, dailyClears: ['2026-09-28'], weeklyMilestone: null },
    settings: { reducedMotion: true, battleSpeed: 2, autoBattle: false, textScale: 1.15, sound: false },
  };

  test('keeps Gloam, Rank, heroes, cards, pity and settings', () => {
    const p = normalizeProfile(v1, now, starters)!;
    expect(p.v).toBe(2);
    expect(p.gloam).toBe(2345);
    expect(p.rank).toBe(7);
    expect(p.collection.heroes['wren']).toEqual({ resonance: 2 });
    expect(p.collection.cards['card.key']).toBe(2);
    expect(p.kindling.pity['featured']).toEqual({ five: 12, four: 3, guaranteed: true });
    expect(p.kindling.spark['rateup-0']).toBe(40);
    expect(p.settings.reducedMotion).toBe(true);
    expect(p.settings.battleSpeed).toBe(2);
  });

  test('picks the old party leader, renames Descent pay in the ledger, and drops the old run', () => {
    const p = normalizeProfile(v1, now, starters)!;
    expect(p.hero).toBe('io');
    expect(p.ledger.daily['climbDaily']).toBe(120);
    expect(p.ledger.weekly['climbFloor']).toBe(80);
    expect(p.climb.run).toBeNull();
    expect(p.climb.dailyClears).toEqual(['2026-09-28']);
    expect(p.progress.flags['firstKindling']).toBe(true);
    expect(p.progress.beats).toContain('prologue');
  });
});

describe('Gloam and Rank', () => {
  test('grants respect caps and spending cannot overdraw', () => {
    const p = mk();
    expect(grantGloam(p, 'task', 100, now)).toBe(75);
    expect(spendGloam(p, p.gloam + 1, now)).toBe(false);
    expect(spendGloam(p, 100, now)).toBe(true);
  });

  test('ranking up pays Gloam', () => {
    const p = mk();
    const before = p.gloam;
    const r = addXp(p, 40 + 60, now);
    expect(r.ranksGained).toBe(2);
    expect(p.gloam).toBe(before + 2 * RANK_UP_GLOAM);
  });
});

describe('Kindling', () => {
  const result = (item: string, rarity: 3 | 4 | 5): PullResult => ({ n: 1, banner: 'standard', item, rarity, featured: false, pity: 'none', viaGuarantee: false, sinceFive: 1 });

  test('the first Kindling happens once and brings the hero', () => {
    const p = mk();
    expect(firstKindling(p, 'io', now)).toBe(true);
    expect(firstKindling(p, 'io', now)).toBe(false);
    expect(p.collection.heroes['io']).toEqual({ resonance: 1 });
    expect(isUnlocked(p, 'kindling')).toBe(true);
  });

  test('pulled cards stack and maxed duplicates pay Gloam', () => {
    const p = mk();
    const out = applyPulls(p, Array.from({ length: 6 }, () => result('card.key', 4)), lookup, now);
    expect(p.collection.cards['card.key']).toBe(5);
    expect(out[5]!.gloam).toBeGreaterThan(0);
  });

  test('ended banners refund spark as Gloam', () => {
    const p = mk();
    p.kindling.spark['rateup-0'] = 10;
    const before = p.gloam;
    expect(expireBanners(p, 1, now)).toBe(500);
    expect(p.gloam).toBe(before + 500);
  });
});

function echo(id: string): CardDef {
  return { id, name: id, kind: 'strike', affinity: 'sun', target: 'foe', cost: 1, atk: 6, ward: 1, tier: 'uncommon', source: 'echo', flavor: '', art: { glyph: 'sigil', hue: 40 }, hour: 3 };
}

describe('heroes, the archive and starting a climb', () => {
  test('only owned heroes can be picked', () => {
    const p = mk();
    expect(() => setHero(p, 'io')).toThrow();
    setHero(p, 'marisol');
    expect(p.hero).toBe('marisol');
  });

  test('the archive keeps Echoes only, without doubles, up to its size', () => {
    const p = mk();
    for (let i = 0; i < ARCHIVE_SIZE + 3; i++) archiveEcho(p, echo(`echo:${i}`));
    archiveEcho(p, echo('echo:14'));
    expect(p.archive).toHaveLength(ARCHIVE_SIZE);
    expect(p.archive[p.archive.length - 1]!.id).toBe('echo:14');
    expect(() => archiveEcho(p, { ...echo('x'), id: 'cut' })).toThrow();
  });

  test('a climb takes the hero’s Resonance, the Rank, kindled cards and the archive', () => {
    const p = mk();
    p.collection.heroes['wren'] = { resonance: 4 };
    p.collection.cards['card.key'] = 3;
    p.rank = 5;
    archiveEcho(p, echo('echo:kept'));
    const s = climbStart(p, { seed: 'x', daily: null, stratum: 0 });
    expect(s.resonance).toBe(4);
    expect(s.rank).toBe(5);
    expect(s.kindled).toEqual({ 'card.key': 3 });
    const run = startClimb(s, climbDeps);
    expect(run.archived).toEqual(['echo:kept']);
    expect(run.echoes.map((e) => e.id)).toEqual(['echo:kept']);
  });

  test('strata open one at a time', () => {
    const p = mk();
    expect(unlockedStrata(p, 3)).toBe(1);
    p.climb.strata['0'] = { clears: 1, reached: 2 };
    expect(unlockedStrata(p, 3)).toBe(2);
  });
});

describe('daily tasks', () => {
  test('fights feed the day’s tasks', () => {
    const p = mk();
    const today = tasksForDay(dayKey(now));
    const done = [
      ...recordFight(p, { ...zeroStats, breaks: 10, chains: 10, ultimates: 10 }, true, 'elite', now),
      ...recordFight(p, zeroStats, true, 'battle', now),
      ...recordFight(p, zeroStats, true, 'battle', now),
      ...recordEvent(p, 'floors', 3, now),
      ...recordEvent(p, 'echoes', 1, now),
    ];
    expect(done.map((d) => d.task.id).sort()).toEqual(today.map((t) => t.id).sort());
    expect(TASKS.every((t) => t.goal > 0)).toBe(true);
  });
});

describe('settling a climb', () => {
  test('pays for floors and the clear, then records it', () => {
    const p = mk();
    const before = p.gloam;
    p.climb.run = finishedRun({ cleared: true, floors: 3, battles: 9 });
    const s = settleClimb(p, p.climb.run, now);
    expect(s.floorGloam).toBe(120);
    expect(s.clearGloam).toBe(60);
    expect(s.xp).toBe(9 * 10 + 3 * 20);
    expect(p.gloam).toBe(before + 180 + s.rankGloam + s.tasks.reduce((a, t) => a + t.gloam, 0));
    expect(p.climb.run).toBeNull();
    expect(p.climb.runs).toBe(1);
    expect(p.climb.strata['0']).toEqual({ clears: 1, reached: 2 });
  });

  test('a failed climb still pays for the floors it cleared', () => {
    const p = mk();
    const s = settleClimb(p, finishedRun({ cleared: false, floors: 1, battles: 4 }), now);
    expect(s.floorGloam).toBe(40);
    expect(s.clearGloam).toBe(0);
    expect(p.climb.strata['0']).toEqual({ clears: 0, reached: 1 });
  });

  test('the daily bonus pays once a day, and three daily clears in a week pay the milestone', () => {
    const p = mk();
    const day = (d: number) => Date.parse(`2026-09-${String(28 + d).padStart(2, '0')}T10:00:00Z`);
    const a = settleClimb(p, finishedRun({ cleared: true, floors: 3, battles: 9, daily: dayKey(day(0)) }), day(0));
    expect(a.dailyGloam).toBe(120);
    const again = settleClimb(p, finishedRun({ cleared: true, floors: 3, battles: 9, daily: dayKey(day(0)) }), day(0));
    expect(again.dailyGloam).toBe(0);
    settleClimb(p, finishedRun({ cleared: true, floors: 3, battles: 9, daily: dayKey(day(1)) }), day(1));
    const third = settleClimb(p, finishedRun({ cleared: true, floors: 3, battles: 9, daily: dayKey(day(2)) }), day(2));
    expect(third.weeklyGloam).toBe(300);
  });
});

describe('story beats', () => {
  test('come due as the climb progresses, pay once and bring heroes', () => {
    const p = mk();
    expect(dueBeats(p, BEAT_DEFS).map((b) => b.id)).toEqual(['prologue']);
    seeBeat(p, BEAT_DEFS[0]!, now);
    expect(dueBeats(p, BEAT_DEFS)).toEqual([]);
    settleClimb(p, finishedRun({ cleared: false, floors: 1, battles: 3 }), now);
    expect(dueBeats(p, BEAT_DEFS).map((b) => b.id)).toEqual(['after-first', 'floor-2']);
    const before = p.gloam;
    const r = seeBeat(p, BEAT_DEFS[1]!, now);
    expect(r.gloam).toBe(60);
    expect(p.gloam).toBe(before + 60);
    expect(seeBeat(p, BEAT_DEFS[1]!, now).gloam).toBe(0);
    expect(seeBeat(p, BEAT_DEFS[2]!, now).unlocked).toEqual(['io']);
    expect(isUnlocked(p, 'daily')).toBe(true);
  });
});
