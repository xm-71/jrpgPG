import { describe, expect, test } from 'vitest';
import { Rng } from '../rng';
import type { Affinity } from '../types';
import { AFFINITIES } from '../types';
import { GUARD_TIME_COST, PASS_BONUS } from './constants';
import type { Action, BattleSetup } from './defs';
import { estimateHit } from './damage';
import { Battle, chainBonus } from './engine';
import type { BattleEvent } from './events';
import { checkInvariants, playout } from './sim';
import { foe, hero, skill } from './testkit';
import { planFor, previewTimeline } from './timeline';
import { cycleOf, getUnit } from './util';

const basic = (target: string): Action => ({ type: 'skill', skill: 'basic', target });
const skillAction = (target?: string): Action => (target ? { type: 'skill', skill: 'skill', target } : { type: 'skill', skill: 'skill' });

/** Submit guard until `pred` is true or we give up. Returns all events produced. */
function guardUntil(b: Battle, pred: (ev: BattleEvent[]) => boolean, max = 12): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let i = 0; i < max && !b.over; i++) {
    all.push(...b.submit({ type: 'guard' }));
    if (pred(all)) break;
  }
  return all;
}

describe('timeline', () => {
  test('the fastest unit acts first', () => {
    const b = Battle.create({ party: [hero('slow', { spd: 90 }), hero('fast', { spd: 120 })], foes: [foe('f')] }, 1);
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'fast', mode: 'turn' });
  });

  test('a foe that is faster than the party acts before it', () => {
    const b = Battle.create({ party: [hero('a', { spd: 80 })], foes: [foe('f', { spd: 150 })] }, 1);
    expect(b.initialEvents.some((e) => e.t === 'foeTurn')).toBe(true);
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'a', mode: 'turn' });
  });

  test('previewTimeline lists the current actor first and stays sorted', () => {
    const b = Battle.create({ party: [hero('a', { spd: 110 }), hero('b', { spd: 100 })], foes: [foe('f', { spd: 90 })] }, 1);
    const line = previewTimeline(b.state, 8);
    expect(line[0]).toMatchObject({ unit: 'a', current: true });
    for (let i = 2; i < line.length; i++) expect(line[i]!.at).toBeGreaterThanOrEqual(line[i - 1]!.at);
    expect(line).toHaveLength(8);
  });

  test('guarding brings the actor back sooner in the preview', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { spd: 20 })] }, 1);
    const normal = previewTimeline(b.state, 4).find((e) => e.unit === 'a' && !e.current)!;
    const guarded = previewTimeline(b.state, 4, planFor(b.state, { type: 'guard' })).find((e) => e.unit === 'a' && !e.current)!;
    expect(guarded.at).toBeCloseTo(normal.at * GUARD_TIME_COST + (1 - GUARD_TIME_COST) * b.state.now, 5);
    expect(guarded.at).toBeLessThan(normal.at);
  });
});

describe('weakness, Shell and Encore', () => {
  test('a weakness hit chips Shell and earns an Encore', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { hp: 5000, shell: 3 })] }, 1);
    const ev = b.submit(basic('f'));
    expect(getUnit(b.state, 'f').shell).toBe(2);
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'a', mode: 'encore' });
    expect(ev.some((e) => e.t === 'encore')).toBe(true);
  });

  test('a neutral hit does not touch Shell or earn an Encore', () => {
    const b = Battle.create({ party: [hero('a', { affinity: 'sun' })], foes: [foe('f', { hp: 5000 })] }, 1);
    b.submit(basic('f'));
    expect(getUnit(b.state, 'f').shell).toBe(3);
    expect(b.state.awaiting).not.toMatchObject({ mode: 'encore' });
  });

  test('a resisted hit deals less than a neutral one', () => {
    const b = Battle.create({ party: [hero('a', { affinity: 'frost' })], foes: [foe('f', { weaknesses: ['flame'], resists: ['frost'] })] }, 1);
    const a = getUnit(b.state, 'a');
    const f = getUnit(b.state, 'f');
    const sk = a.kit!.basic;
    const resisted = estimateHit(a, f, sk);
    const neutral = estimateHit(a, f, { ...sk, affinity: 'sun' });
    expect(resisted.resist).toBe(true);
    expect(resisted.amount).toBeLessThan(neutral.amount);
  });

  test('the Encore action cannot earn another Encore', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { hp: 5000, shell: 5 })] }, 1);
    b.submit(basic('f'));
    expect(b.state.awaiting).toMatchObject({ mode: 'encore' });
    b.submit(basic('f'));
    expect(getUnit(b.state, 'f').shell).toBe(3);
    expect(b.state.awaiting).not.toMatchObject({ mode: 'encore' });
  });

  test('hitting a Broken enemys weakness again does not earn an Encore', () => {
    const b = Battle.create(
      { party: [hero('a'), hero('b', { spd: 95 })], foes: [foe('f', { hp: 9000, shell: 1 }), foe('g', { hp: 9000, shell: 5 })] },
      1,
    );
    b.submit(basic('f')); // breaks f, earns Encore
    expect(getUnit(b.state, 'f').broken).toBe(true);
    b.submit(basic('f')); // Encore action on the already Broken f: no new Encore
    expect(b.state.awaiting).not.toMatchObject({ mode: 'encore' });
  });
});

describe('Break', () => {
  test('emptying Shell breaks the enemy, which then skips its next turn and recovers', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { hp: 9000, shell: 1, atk: 200 })] }, 1);
    const ev = b.submit(basic('f'));
    expect(ev.some((e) => e.t === 'break' && e.unit === 'f')).toBe(true);
    const f = getUnit(b.state, 'f');
    expect(f.broken).toBe(true);
    expect(f.intent).toBeNull();

    const next = guardUntil(b, (e) => e.some((x) => x.t === 'skip'));
    expect(next.some((e) => e.t === 'skip' && e.unit === 'f')).toBe(true);
    expect(next.some((e) => e.t === 'recover' && e.unit === 'f')).toBe(true);
    expect(getUnit(b.state, 'a').hp).toBe(getUnit(b.state, 'a').maxHp);
    expect(f.broken).toBe(false);
    expect(f.shell).toBe(f.maxShell);
    expect(f.intent).not.toBeNull();
  });

  test('a Broken target takes 50% more damage', () => {
    const b = Battle.create({ party: [hero('a', { affinity: 'sun' })], foes: [foe('f')] }, 1);
    const a = getUnit(b.state, 'a');
    const f = getUnit(b.state, 'f');
    const before = estimateHit(a, f, a.kit!.basic).amount;
    f.broken = true;
    f.shell = 0;
    const after = estimateHit(a, f, a.kit!.basic).amount;
    expect(after / before).toBeGreaterThan(1.48);
    expect(after / before).toBeLessThan(1.52);
  });

  test('Break pushes the enemys next turn back', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { hp: 9000, shell: 1 })] }, 1);
    const f = getUnit(b.state, 'f');
    const before = f.nextAt;
    b.submit(basic('f'));
    expect(f.nextAt).toBeCloseTo(before + 0.25 * cycleOf(f), 5);
  });
});

describe('Pass', () => {
  const setup = (): BattleSetup => ({
    party: [hero('a', { spd: 110 }), hero('b', { spd: 100 })],
    foes: [foe('f', { hp: 9000, shell: 6, spd: 80 })],
  });

  test('the Encore holder can pass to an ally who has not acted, never to itself', () => {
    const b = Battle.create(setup(), 1);
    b.submit(basic('f'));
    const passes = b.legalActions().filter((a) => a.type === 'pass');
    expect(passes).toEqual([{ type: 'pass', to: 'b' }]);
    expect(() => b.submit({ type: 'pass', to: 'a' })).toThrow(/Illegal/);
  });

  test('a pass hands the turn over with a damage bonus and leaves the ally on their own schedule', () => {
    const b = Battle.create(setup(), 1);
    const bUnit = getUnit(b.state, 'b');
    const bStart = bUnit.nextAt;
    b.submit(basic('f'));
    const ev = b.submit({ type: 'pass', to: 'b' });
    expect(ev.some((e) => e.t === 'pass' && e.from === 'a' && e.to === 'b' && e.count === 1)).toBe(true);
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'b', mode: 'passed' });
    expect(chainBonus(b.state, bUnit)).toBeCloseTo(1 + PASS_BONUS, 5);

    b.submit(basic('f')); // b hits the weakness and earns its own Encore
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'b', mode: 'encore' });
    expect(b.legalActions().some((x) => x.type === 'pass')).toBe(false); // everyone already had a slot
    b.submit({ type: 'guard' });

    // The chain is over. a was rescheduled; b still acts at its own original time.
    expect(b.state.chain).not.toBeNull();
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'b', mode: 'turn' });
    expect(bUnit.nextAt).toBe(bStart);
    expect(getUnit(b.state, 'a').nextAt).toBeGreaterThan(bStart);
  });

  test('the pass bonus caps out', () => {
    const b = Battle.create(
      { party: [hero('a'), hero('b'), hero('c'), hero('d')], foes: [foe('f', { hp: 99999, shell: 20 })] },
      3,
    );
    const a = getUnit(b.state, 'a');
    const order: string[] = [];
    b.submit(basic('f'));
    for (const id of ['b', 'c', 'd']) {
      b.submit({ type: 'pass', to: id });
      order.push(id);
      expect(chainBonus(b.state, getUnit(b.state, id))).toBeLessThanOrEqual(1.3 + 1e-9);
      if (id !== 'd') b.submit(basic('f'));
    }
    expect(order).toEqual(['b', 'c', 'd']);
    expect(a.alive).toBe(true);
  });
});

describe('Horizon Burst', () => {
  const setup = (): BattleSetup => ({
    party: [hero('a', { spd: 120 }), hero('b', { spd: 110 }), hero('c', { spd: 100 })],
    foes: [foe('f1', { hp: 9000, shell: 1 }), foe('f2', { hp: 9000, shell: 1 })],
  });

  test('is only offered once every living enemy is Broken', () => {
    const b = Battle.create(setup(), 1);
    expect(b.legalActions().some((a) => a.type === 'burst')).toBe(false);
    b.submit(basic('f1'));
    expect(b.legalActions().some((a) => a.type === 'burst')).toBe(false);
    b.submit(basic('f2')); // Encore action breaks the second enemy
    expect(getUnit(b.state, 'f1').broken && getUnit(b.state, 'f2').broken).toBe(true);
    expect(b.legalActions().some((a) => a.type === 'burst')).toBe(true);
  });

  test('every party member strikes every enemy, and the Break is spent', () => {
    const b = Battle.create(setup(), 1);
    b.submit(basic('f1'));
    b.submit(basic('f2'));
    const ev = b.submit({ type: 'burst' });
    expect(ev.some((e) => e.t === 'burst')).toBe(true);
    const hits = ev.filter((e) => e.t === 'hit');
    expect(hits).toHaveLength(3 * 2);
    for (const id of ['f1', 'f2']) {
      const f = getUnit(b.state, id);
      expect(f.broken).toBe(false);
      expect(f.shell).toBe(f.maxShell);
      expect(f.intent).not.toBeNull();
    }
  });

  test('can finish a fight', () => {
    const b = Battle.create(
      { party: [hero('a', { atk: 400 })], foes: [foe('f', { hp: 300, shell: 1, def: 0 })] },
      1,
    );
    b.submit(basic('f')); // weakness hit that also kills... or breaks; either way the fight resolves
    if (!b.over) {
      expect(b.legalActions().some((a) => a.type === 'burst')).toBe(true);
      b.submit({ type: 'burst' });
    }
    expect(b.result).toBe('victory');
  });
});

describe('Lantern, ultimates and guard', () => {
  test('basic attacks build Lantern up to the cap and skills spend it', () => {
    const b = Battle.create({ party: [hero('a', { affinity: 'sun' })], foes: [foe('f', { hp: 9000 })], startLantern: 4 }, 1);
    b.submit(basic('f'));
    expect(b.state.lantern).toBe(5);
    guardUntil(b, () => b.state.awaiting.type === 'input' && b.state.awaiting.mode === 'turn', 1);
    const before = b.state.lantern;
    b.submit(skillAction('f'));
    expect(b.state.lantern).toBe(Math.min(5, before) - 1);
  });

  test('a skill is not offered when the pool is too low', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f')], startLantern: 0 }, 1);
    expect(b.legalActions().some((a) => a.type === 'skill' && a.skill === 'skill')).toBe(false);
    expect(b.legalActions().some((a) => a.type === 'skill' && a.skill === 'basic')).toBe(true);
    expect(() => b.submit(skillAction('f'))).toThrow(/Illegal/);
  });

  test('an ultimate needs a full gauge, resets it, and does not use the action', () => {
    const b = Battle.create(
      { party: [hero('a', { gauge: 100 }), hero('b', { spd: 95 })], foes: [foe('f', { hp: 9000, shell: 6 })] },
      1,
    );
    const ults = b.legalActions().filter((a) => a.type === 'ultimate');
    expect(ults).toEqual([{ type: 'ultimate', unit: 'a', target: 'f' }]);
    b.submit(ults[0]!);
    expect(getUnit(b.state, 'a').gauge).toBeLessThan(100);
    expect(b.state.awaiting).toEqual({ type: 'input', actor: 'a', mode: 'turn' }); // still a's turn
    expect(b.legalActions().some((a) => a.type === 'ultimate')).toBe(false);
  });

  test('an ultimate never earns an Encore', () => {
    const b = Battle.create({ party: [hero('a', { gauge: 100 })], foes: [foe('f', { hp: 9000, shell: 6 })] }, 1);
    b.submit({ type: 'ultimate', unit: 'a', target: 'f' });
    expect(b.state.awaiting).toMatchObject({ mode: 'turn' });
  });

  test('guarding halves incoming damage until the guarder acts again', () => {
    const b = Battle.create({ party: [hero('a')], foes: [foe('f', { atk: 100, spd: 60 })] }, 1);
    const a = getUnit(b.state, 'a');
    const f = getUnit(b.state, 'f');
    const foeSkill = f.foeKit[0]!;
    const open = estimateHit(f, a, foeSkill).amount;
    a.guarding = true;
    expect(estimateHit(f, a, foeSkill).amount).toBeGreaterThanOrEqual(Math.floor(open / 2));
    expect(estimateHit(f, a, foeSkill).amount).toBeLessThanOrEqual(Math.ceil(open / 2));
    a.guarding = false;

    // The foe acts before a's next turn. Even a crit on a guarded target is below any unguarded roll.
    const ev = b.submit({ type: 'guard' });
    const hits = ev.filter((e) => e.t === 'hit' && e.actor === 'f');
    expect(hits).toHaveLength(1);
    const taken = hits[0]!.t === 'hit' ? hits[0]!.amount : 0;
    expect(taken).toBeLessThan(open * 0.96);
    expect(taken).toBeGreaterThan(open * 0.4);

    // The guard wore off when a's turn came round, and guarding shortened the wait.
    expect(a.guarding).toBe(false);
    expect(b.state.awaiting).toMatchObject({ type: 'input', actor: 'a', mode: 'turn' });
    expect(b.state.now).toBeCloseTo(100 + cycleOf(a) * GUARD_TIME_COST, 3);
  });
});

describe('effects', () => {
  test('taunt pulls single-target enemy attacks, even ones already declared', () => {
    const b = Battle.create(
      {
        party: [
          hero('tank', {
            spd: 130,
            hp: 3000,
            affinity: 'sun',
            skill: { target: 'self', power: 0, shell: 0, lantern: -1, effects: [{ type: 'taunt', turns: 2 }] },
          }),
          hero('glass', { spd: 90, hp: 200 }),
        ],
        foes: [foe('f', { atk: 80, spd: 100, ai: { focus: 'lowestHp' } })],
      },
      5,
    );
    const ev = b.submit(skillAction());
    const hits = ev.filter((e) => e.t === 'hit' && e.actor === 'f');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.t === 'hit' && h.target).toBe('tank');
  });

  test('buffs last their full duration for the caster, counted in its own turns', () => {
    const b = Battle.create(
      {
        party: [
          hero('a', {
            affinity: 'sun',
            hp: 99999,
            skill: { target: 'self', power: 0, shell: 0, lantern: -1, effects: [{ type: 'mod', on: 'self', stat: 'atk', pct: 0.25, turns: 2 }] },
          }),
        ],
        foes: [foe('f', { atk: 1, hp: 99999 })],
      },
      1,
    );
    const a = getUnit(b.state, 'a');
    b.submit(skillAction());
    expect(a.mods.map((m) => m.turns)).toEqual([2]); // the turn it was cast does not count
    b.submit({ type: 'guard' });
    expect(a.mods.map((m) => m.turns)).toEqual([1]);
    b.submit({ type: 'guard' });
    expect(a.mods).toEqual([]);
  });

  test('delay pushes an enemy back by a share of its cycle', () => {
    const b = Battle.create(
      {
        party: [hero('a', { affinity: 'sun', skill: { effects: [{ type: 'delay', on: 'targets', pct: 0.3 }] } })],
        foes: [foe('f', { hp: 9000, spd: 20 })],
      },
      1,
    );
    const f = getUnit(b.state, 'f');
    const before = f.nextAt;
    const shifts = planFor(b.state, skillAction('f')).shifts!;
    expect(shifts).toEqual([{ unit: 'f', delta: 0.3 * cycleOf(f) }]);
    b.submit(skillAction('f'));
    expect(f.nextAt).toBeCloseTo(before + 0.3 * cycleOf(f), 5);
  });

  test('healing restores HP but never past the maximum', () => {
    const b = Battle.create(
      {
        party: [
          hero('healer', {
            affinity: 'gale',
            skill: { target: 'ally', power: 0, shell: 0, lantern: -1, effects: [{ type: 'heal', on: 'targets', of: 'maxHp', scale: 0.5 }] },
          }),
          hero('hurt', { spd: 60 }),
        ],
        foes: [foe('f', { atk: 1, hp: 9000, spd: 10 })],
      },
      1,
    );
    const hurt = getUnit(b.state, 'hurt');
    hurt.hp = 100;
    const ev = b.submit(skillAction('hurt'));
    expect(hurt.hp).toBe(600);
    expect(ev.some((e) => e.t === 'heal' && e.amount === 500)).toBe(true);
    // Healing a full-HP ally does nothing.
    guardUntil(b, () => b.state.awaiting.type === 'input' && b.state.awaiting.actor === 'healer', 4);
    const ev2 = b.submit(skillAction('healer'));
    expect(ev2.some((e) => e.t === 'heal')).toBe(false);
  });

  test('Glimmer-style passives change starting values', () => {
    const b = Battle.create(
      {
        party: [hero('a'), hero('b')],
        foes: [foe('f')],
        partyPassives: [
          { type: 'startGauge', value: 30 },
          { type: 'startLantern', value: 1 },
          { type: 'stat', stat: 'atk', pct: 0.1 },
        ],
      },
      1,
    );
    expect(getUnit(b.state, 'a').gauge).toBe(30);
    expect(getUnit(b.state, 'b').gauge).toBe(30);
    expect(b.state.lantern).toBe(4);
    expect(getUnit(b.state, 'a').stats.atk).toBeCloseTo(110, 5);
  });
});

describe('outcomes', () => {
  test('winning ends the battle with a victory', () => {
    const b = Battle.create({ party: [hero('a', { atk: 5000 })], foes: [foe('f', { hp: 100 })] }, 1);
    const ev = b.submit(basic('f'));
    expect(b.result).toBe('victory');
    expect(b.over).toBe(true);
    expect(ev.at(-1)).toMatchObject({ t: 'end', result: 'victory' });
    expect(b.legalActions()).toEqual([]);
    expect(() => b.submit({ type: 'guard' })).toThrow();
  });

  test('losing everyone ends the battle with a defeat', () => {
    const b = Battle.create({ party: [hero('a', { hp: 10 })], foes: [foe('f', { atk: 900, spd: 200, hp: 99999 })] }, 1);
    for (let i = 0; i < 20 && !b.over; i++) b.submit({ type: 'guard' });
    expect(b.result).toBe('defeat');
  });

  test('a starting HP fraction carries over', () => {
    const b = Battle.create({ party: [{ ...hero('a'), hpPct: 0.4 }], foes: [foe('f')] }, 1);
    expect(getUnit(b.state, 'a').hp).toBe(400);
  });

  test('bad setups fail loudly', () => {
    expect(() => Battle.create({ party: [], foes: [foe('f')] }, 1)).toThrow();
    expect(() => Battle.create({ party: [hero('a')], foes: [] }, 1)).toThrow();
    expect(() => Battle.create({ party: [hero('a')], foes: [foe('a')] }, 1)).toThrow(/unique/);
    expect(() => Battle.create({ party: [hero('a')], foes: [{ ...foe('f'), foeKit: [] }] }, 1)).toThrow(/no skills/);
  });
});

describe('determinism and soundness', () => {
  const mixed = (): BattleSetup => ({
    party: [
      hero('a', { affinity: 'sun', spd: 112 }),
      hero('b', { affinity: 'frost', spd: 104 }),
      hero('c', { affinity: 'volt', spd: 98 }),
    ],
    foes: [
      foe('f1', { weaknesses: ['sun', 'gale'], hp: 700, shell: 3 }),
      foe('f2', { weaknesses: ['frost'], hp: 900, shell: 4, atk: 80 }),
    ],
  });

  test('the same seed and inputs replay identically', () => {
    for (const seed of [1, 2, 3, 'seven']) {
      const x = playout(mixed(), seed, { keepEvents: true });
      const y = playout(mixed(), seed, { keepEvents: true });
      expect(JSON.stringify(x.events)).toBe(JSON.stringify(y.events));
      expect(x.result).toBe(y.result);
    }
  });

  test('different seeds produce different fights', () => {
    const logs = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) logs.add(JSON.stringify(playout(mixed(), seed, { keepEvents: true }).events));
    expect(logs.size).toBeGreaterThan(1);
  });

  test('a clone plays on independently and identically', () => {
    const a = Battle.create(mixed(), 42);
    const b = a.clone();
    a.submit(a.legalActions()[0]!);
    expect(JSON.stringify(b.state)).not.toBe(JSON.stringify(a.state));
    b.submit(b.legalActions()[0]!);
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
  });

  test('random battles never break a rule and always finish', () => {
    const rng = new Rng('property');
    const skillKinds = (id: string, aoe: boolean) =>
      skill({ id, kind: 'skill', target: aoe ? 'allEnemies' : 'enemy', power: aoe ? 0.7 : 1.2, shell: 0, lantern: 0, gauge: 0 });
    for (let n = 0; n < 120; n++) {
      const party = Array.from({ length: 1 + rng.int(4) }, (_, i) =>
        hero(`p${i}`, {
          affinity: rng.pick<Affinity>(AFFINITIES),
          spd: 80 + rng.int(60),
          atk: 70 + rng.int(60),
          hp: 500 + rng.int(700),
        }),
      );
      const foes = Array.from({ length: 1 + rng.int(4) }, (_, i) => {
        const weaknesses = rng.shuffle([...AFFINITIES]).slice(0, 1 + rng.int(2));
        return foe(`e${i}`, {
          weaknesses,
          shell: 1 + rng.int(6),
          hp: 250 + rng.int(1400),
          atk: 40 + rng.int(70),
          spd: 60 + rng.int(70),
          skills: [skillKinds(`e${i}-a`, false), skillKinds(`e${i}-b`, true)],
          ai: rng.chance(0.5) ? { pattern: [`e${i}-a`, `e${i}-a`, `e${i}-b`] } : { focus: rng.pick(['random', 'lowestHp', 'highestAtk'] as const) },
        });
      });
      const problems: string[] = [];
      const out = playout({ party, foes }, `prop-${n}`, {
        onStep: (battle) => problems.push(...checkInvariants(battle.state)),
      });
      expect(problems, `battle ${n}`).toEqual([]);
      expect(out.timedOut, `battle ${n} did not finish`).toBe(false);
      expect(out.result).not.toBeNull();
    }
  });
});
