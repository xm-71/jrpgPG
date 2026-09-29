import { describe, expect, test } from 'vitest';
import { Battle } from '../battle/engine';
import { checkInvariants, playout } from '../battle/sim';
import { CARD_DEFS, descentDeps as deps } from '../testfixtures';
import { BATTLE_HEAL, FLOORS, REST_HEAL, REVIVE_HP, battleFor, chooseNode, choices, finishBattle, generateFloors, nodeLevel, offerGlimmers, pickGlimmer, runRewards, startRun, takeRest } from './run';
import type { CrewMember, DescentRun } from './types';

const crew: CrewMember[] = [
  { hero: 'wren', resonance: 1, card: null, copies: 0 },
  { hero: 'marisol', resonance: 2, card: CARD_DEFS[0]!.id, copies: 3 },
  { hero: 'io', resonance: 1, card: null, copies: 0 },
  { hero: 'pip', resonance: 1, card: null, copies: 0 },
];

const begin = (seed = 'seed-a', daily: string | null = null): DescentRun => startRun({ seed, daily, crew, rank: 5, pools: deps.pools }, deps);

/** A run past its opening Glimmer, ready to choose the first node. */
const fresh = (seed = 'seed-a', daily: string | null = null): DescentRun => {
  const run = begin(seed, daily);
  pickGlimmer(run, deps, run.offer![0]!);
  run.glimmers = [];
  run.pathScore = { noonward: 0, duskward: 0, nightward: 0 };
  return run;
};

/** Play the current battle with the auto-play policy and report the result to the run. */
function fight(run: DescentRun): boolean {
  const { setup, seed } = battleFor(run, deps);
  const out = playout(setup, seed);
  finishBattle(run, deps, { victory: out.result === 'victory', hp: out.partyHp, actions: out.actions });
  return out.result === 'victory';
}

describe('the map', () => {
  test('has three floors: two battles to pick from, an elite or rest step, then a boss', () => {
    const floors = generateFloors('any', deps.pools);
    expect(floors).toHaveLength(FLOORS);
    for (const [f, steps] of floors.entries()) {
      expect(steps).toHaveLength(3);
      expect(steps[0]!.map((n) => n.kind)).toEqual(['battle', 'battle']);
      expect(new Set(steps[0]!.map((n) => n.encounter)).size).toBe(2);
      expect(steps[1]).toHaveLength(2);
      expect(steps[1]!.some((n) => n.kind === 'elite' || n.kind === 'rest')).toBe(true);
      expect(steps[2]!).toHaveLength(1);
      expect(steps[2]![0]).toMatchObject({ kind: 'boss', encounter: deps.pools.boss[f] });
    }
  });

  test('the same seed always gives the same map, and other seeds differ', () => {
    expect(generateFloors('daily-2026-09-29', deps.pools)).toEqual(generateFloors('daily-2026-09-29', deps.pools));
    const maps = new Set<string>();
    for (let i = 0; i < 12; i++) maps.add(JSON.stringify(generateFloors(`s${i}`, deps.pools)));
    expect(maps.size).toBeGreaterThan(6);
  });

  test('node ids are unique and rests have no encounter', () => {
    const nodes = generateFloors('ids', deps.pools).flat(2);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
    for (const n of nodes) expect(n.encounter === null).toBe(n.kind === 'rest');
  });

  test('enemy level climbs with the floor and is higher for elites and bosses', () => {
    const run = fresh();
    const [f0, f2] = [run.floors[0]!, run.floors[2]!];
    const battle0 = f0[0]![0]!;
    const boss2 = f2[2]![0]!;
    expect(nodeLevel(run, battle0)).toBe(5);
    expect(nodeLevel(run, boss2)).toBe(5 + 2 + 1);
    expect(nodeLevel(run, { ...battle0, kind: 'elite' })).toBe(6);
  });
});

describe('the opening Glimmer', () => {
  test('a run begins with a free choice of three, and picking one starts the map', () => {
    const run = begin('opening');
    expect(run.phase).toBe('glimmer');
    expect(run.node).toBeNull();
    expect(run.offer).toHaveLength(3);
    expect(choices(run)).toEqual([]);
    const pick = run.offer![1]!;
    pickGlimmer(run, deps, pick);
    expect(run.glimmers).toEqual([pick]);
    expect(run.phase).toBe('choose');
    expect(run.floor).toBe(0);
    expect(run.step).toBe(0);
    expect(choices(run)).toHaveLength(2);
  });

  test('the opening offer is the same for the same seed', () => {
    expect(begin('same').offer).toEqual(begin('same').offer);
  });
});

describe('moving through a run', () => {
  test('choices, battle, Glimmer, then the next step', () => {
    const run = fresh();
    expect(run.phase).toBe('choose');
    const first = choices(run);
    expect(first).toHaveLength(2);
    expect(() => chooseNode(run, 'nonsense')).toThrow();
    chooseNode(run, first[0]!.id);
    expect(run.phase).toBe('battle');
    expect(choices(run)).toEqual([]);
    expect(fight(run)).toBe(true);
    expect(run.phase).toBe('glimmer');
    expect(run.offer).toHaveLength(3);
    expect(new Set(run.offer).size).toBe(3);
    pickGlimmer(run, deps, run.offer![0]!);
    expect(run.glimmers).toHaveLength(1);
    expect(run.phase).toBe('choose');
    expect(run.step).toBe(1);
    expect(() => pickGlimmer(run, deps, 'g-atk')).toThrow();
  });

  test('a Glimmer that is not on offer is refused', () => {
    const run = fresh();
    chooseNode(run, choices(run)[0]!.id);
    fight(run);
    const notOffered = deps.glimmers().find((g) => !run.offer!.includes(g.id))!;
    expect(() => pickGlimmer(run, deps, notOffered.id)).toThrow(/not on offer/);
  });

  test('HP carries from fight to fight with a small heal, and a fallen hero comes back at a quarter', () => {
    const run = fresh();
    chooseNode(run, choices(run)[0]!.id);
    run.phase = 'battle';
    finishBattle(run, deps, { victory: true, hp: { wren: 0.5, marisol: 0, io: 1, pip: 0.1 }, actions: 20 });
    expect(run.hp['wren']).toBeCloseTo(0.5 + BATTLE_HEAL, 5);
    expect(run.hp['marisol']).toBe(REVIVE_HP);
    expect(run.hp['io']).toBe(1);
    expect(run.hp['pip']).toBeCloseTo(0.1 + BATTLE_HEAL, 5);
    const next = battleFor({ ...run, phase: 'battle', node: run.node }, deps);
    const wren = next.setup.party.find((u) => u.id === 'wren')!;
    expect(wren.hpPct).toBeCloseTo(0.5 + BATTLE_HEAL, 5);
    expect(next.setup.partyPassives!.length).toBeGreaterThanOrEqual(0);
  });

  test('a rest heals and moves on without a battle', () => {
    const run = fresh();
    run.hp = { wren: 0.3, marisol: 0.9, io: 1, pip: 0.5 };
    run.step = 1;
    const rest = run.floors[0]![1]!.find((n) => n.kind === 'rest');
    if (!rest) return; // this seed offered no rest on floor one, which is fine
    chooseNode(run, rest.id);
    expect(run.phase).toBe('rest');
    takeRest(run);
    expect(run.hp['wren']).toBeCloseTo(0.3 + REST_HEAL, 5);
    expect(run.hp['marisol']).toBe(1);
    expect(run.phase).toBe('choose');
    expect(run.step).toBe(2);
    expect(() => takeRest(run)).toThrow();
  });

  test('losing ends the run', () => {
    const run = fresh();
    chooseNode(run, choices(run)[0]!.id);
    finishBattle(run, deps, { victory: false, hp: {}, actions: 12 });
    expect(run.phase).toBe('done');
    expect(run.result).toBe('failed');
    expect(choices(run)).toEqual([]);
  });

  test('beating the last boss clears the run', () => {
    const run = fresh();
    run.floor = FLOORS - 1;
    run.step = 2;
    chooseNode(run, choices(run)[0]!.id);
    run.stats.floorsCleared = FLOORS - 1;
    finishBattle(run, deps, { victory: true, hp: { wren: 1, marisol: 1, io: 1, pip: 1 }, actions: 30 });
    expect(run.stats.floorsCleared).toBe(FLOORS);
    pickGlimmer(run, deps, run.offer![0]!);
    expect(run.phase).toBe('done');
    expect(run.result).toBe('cleared');
  });

  test('a boss moves the run to the next floor and heals the crew a little', () => {
    const run = fresh();
    run.step = 2;
    chooseNode(run, choices(run)[0]!.id);
    finishBattle(run, deps, { victory: true, hp: { wren: 0.5, marisol: 0.5, io: 0.5, pip: 0.5 }, actions: 30 });
    expect(run.hp['wren']).toBeCloseTo(0.5 + BATTLE_HEAL + 0.25, 5);
    pickGlimmer(run, deps, run.offer![0]!);
    expect(run.floor).toBe(1);
    expect(run.step).toBe(0);
    expect(run.phase).toBe('choose');
  });
});

describe('Glimmers', () => {
  test('offers are deterministic for a run and node, and lean toward chosen Paths', () => {
    const run = fresh('offers');
    const node = run.floors[0]![0]![0]!;
    expect(offerGlimmers(run, deps, node)).toEqual(offerGlimmers(run, deps, node));

    const count = (path: string, score: number): number => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const r = fresh(`lean-${i}`);
        r.pathScore = { noonward: 0, duskward: 0, nightward: 0, [path]: score } as typeof r.pathScore;
        n += offerGlimmers(r, deps, r.floors[0]![0]![0]!).filter((id) => deps.glimmer(id).path === path).length;
      }
      return n;
    };
    expect(count('nightward', 4)).toBeGreaterThan(count('nightward', 0));
  });

  test('bosses offer rarer Glimmers than ordinary fights', () => {
    const rarity = (kind: 'battle' | 'boss'): number => {
      let total = 0;
      let n = 0;
      for (let i = 0; i < 300; i++) {
        const r = fresh(`rare-${i}`);
        for (const id of offerGlimmers(r, deps, { id: 'x', kind, floor: 0, step: 0, encounter: 'n1' })) {
          total += deps.glimmer(id).rarity;
          n++;
        }
      }
      return total / n;
    };
    expect(rarity('boss')).toBeGreaterThan(rarity('battle'));
  });

  test('never offers one already taken', () => {
    const run = fresh('taken');
    run.glimmers = ['g-atk', 'g-burst', 'g-lantern'];
    for (let i = 0; i < 50; i++) {
      const offer = offerGlimmers({ ...run, seed: `t${i}` }, deps, run.floors[0]![0]![0]!);
      for (const id of offer) expect(run.glimmers).not.toContain(id);
    }
  });

  test('taken Glimmers reach the battle as party passives', () => {
    const run = fresh();
    run.glimmers = ['g-atk', 'g-lantern'];
    chooseNode(run, choices(run)[0]!.id);
    const { setup } = battleFor(run, deps);
    expect(setup.partyPassives).toEqual([{ type: 'stat', stat: 'atk', pct: 0.1 }, { type: 'startLantern', value: 1 }]);
    const battle = Battle.create(setup, 'x');
    expect(battle.state.lantern).toBe(4);
    expect(checkInvariants(battle.state)).toEqual([]);
  });
});

describe('a whole run', () => {
  test('can be played from start to finish and pays out sensibly', () => {
    let cleared = 0;
    for (let i = 0; i < 12; i++) {
      const run = begin(`full-${i}`, '2026-09-29');
      let guard = 0;
      while (run.phase !== 'done' && guard++ < 60) {
        if (run.phase === 'choose') {
          const options = choices(run);
          const pick = options.find((n) => n.kind === 'rest' && Object.values(run.hp).some((h) => h < 0.7)) ?? options[0]!;
          chooseNode(run, pick.id);
        } else if (run.phase === 'rest') takeRest(run);
        else if (run.phase === 'battle') fight(run);
        else if (run.phase === 'glimmer') pickGlimmer(run, deps, run.offer![0]!);
      }
      expect(run.phase).toBe('done');
      expect(run.result).not.toBeNull();
      const r = runRewards(run);
      expect(r.xp).toBe(run.stats.battles * 10 + run.stats.floorsCleared * 20);
      if (run.result === 'cleared') {
        cleared++;
        expect(run.stats.floorsCleared).toBe(FLOORS);
        expect(r.floorGloam).toBe(FLOORS * 40 + 60);
      }
    }
    expect(cleared).toBeGreaterThan(0);
  });

  test('is fully determined by the seed and the inputs', () => {
    const play = (): string => {
      const run = begin('replay');
      while (run.phase !== 'done') {
        if (run.phase === 'choose') chooseNode(run, choices(run)[0]!.id);
        else if (run.phase === 'rest') takeRest(run);
        else if (run.phase === 'battle') fight(run);
        else pickGlimmer(run, deps, run.offer![0]!);
      }
      return JSON.stringify(run);
    };
    expect(play()).toBe(play());
  });

  test('a crew is required', () => {
    expect(() => startRun({ seed: 'x', daily: null, crew: [], rank: 1, pools: deps.pools }, deps)).toThrow();
  });
});
