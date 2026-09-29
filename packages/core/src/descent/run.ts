import type { BattleSetup, Passive } from '../battle/defs';
import type { CardDef, EncounterDef, EnemyDef, HeroDef } from '../data';
import { Rng, deriveSeed, rngPick, rngShuffle, seedRng } from '../rng';
import { cardPassives, encounterFoes, heroUnit } from '../setup';
import type { CrewMember, DescentNode, DescentPools, DescentRun, GlimmerDef, NodeKind, PathId } from './types';

export const FLOORS = 3;

export const FLOOR_GLOAM = 40;
export const CLEAR_GLOAM = 60;
export const DAILY_GLOAM = 120;
export const WEEKLY_MILESTONE_GLOAM = 300;
/** Daily runs cleared on this many different days in a week pay the weekly milestone. */
export const WEEKLY_MILESTONE_DAYS = 3;
export const XP_PER_BATTLE = 10;
export const XP_PER_FLOOR = 20;

/** Heal at a rest, and after each floor boss, as a fraction of max HP. */
export const REST_HEAL = 0.4;
export const FLOOR_HEAL = 0.25;
/** A fallen hero is back on their feet at this HP after a won battle. */
export const REVIVE_HP = 0.25;
/** Everyone standing at the end of a won battle recovers this much, so a run is not decided by healers alone. */
export const BATTLE_HEAL = 0.25;

/** Everything the run logic needs to look up. Provided by the content package. */
export interface DescentDeps {
  hero(id: string): HeroDef;
  card(id: string): CardDef | undefined;
  enemy(id: string): EnemyDef;
  encounter(id: string): EncounterDef;
  glimmer(id: string): GlimmerDef;
  glimmers(): readonly GlimmerDef[];
  pools: DescentPools;
}

function node(floor: number, step: number, i: number, kind: NodeKind, encounter: string | null): DescentNode {
  return { id: `f${floor}s${step}n${i}`, kind, floor, step, encounter };
}

export function generateFloors(seed: string, pools: DescentPools): DescentNode[][][] {
  const rng = seedRng(deriveSeed(seed, 'map'));
  const floors: DescentNode[][][] = [];
  for (let f = 0; f < FLOORS; f++) {
    const steps: DescentNode[][] = [];
    const normals = rngShuffle(rng, [...pools.normal]);
    steps.push([node(f, 0, 0, 'battle', normals[0]!), node(f, 0, 1, 'battle', normals[1]!)]);

    const pair = rngPick(rng, [
      ['elite', 'rest'],
      ['elite', 'rest'],
      ['elite', 'battle'],
      ['rest', 'battle'],
    ] as const);
    const elites = rngShuffle(rng, [...pools.elite]);
    steps.push(
      pair.map((kind, i) => {
        if (kind === 'rest') return node(f, 1, i, 'rest', null);
        return node(f, 1, i, kind, kind === 'elite' ? elites[0]! : normals[2 % normals.length]!);
      }),
    );
    steps.push([node(f, 2, 0, 'boss', pools.boss[f % pools.boss.length]!)]);
    floors.push(steps);
  }
  return floors;
}

export interface StartOptions {
  seed: string;
  daily: string | null;
  crew: CrewMember[];
  rank: number;
  pools: DescentPools;
}

/** A stand-in node for the opening offer, so it is seeded like any other. */
const START_NODE: DescentNode = { id: 'start', kind: 'elite', floor: 0, step: 0, encounter: null };

/** A new run begins with a free choice of Glimmer, so a crew can cover its weak spot. */
export function startRun(o: StartOptions, deps: DescentDeps): DescentRun {
  if (o.crew.length === 0) throw new Error('A Descent needs a crew');
  const run: DescentRun = {
    v: 1,
    seed: o.seed,
    daily: o.daily,
    crew: o.crew.map((c) => ({ ...c })),
    rank: o.rank,
    floors: generateFloors(o.seed, o.pools),
    floor: 0,
    step: 0,
    node: null,
    hp: Object.fromEntries(o.crew.map((c) => [c.hero, 1])),
    glimmers: [],
    pathScore: { noonward: 0, duskward: 0, nightward: 0 },
    offer: null,
    phase: 'choose',
    result: null,
    stats: { battles: 0, floorsCleared: 0, actions: 0 },
  };
  run.offer = offerGlimmers(run, deps, START_NODE);
  if (run.offer.length > 0) run.phase = 'glimmer';
  else run.offer = null;
  return run;
}

/** The options on offer right now. */
export function choices(run: DescentRun): DescentNode[] {
  if (run.phase !== 'choose') return [];
  return run.floors[run.floor]?.[run.step] ?? [];
}

export function chooseNode(run: DescentRun, nodeId: string): void {
  const picked = choices(run).find((n) => n.id === nodeId);
  if (!picked) throw new Error(`${nodeId} is not on offer`);
  run.node = picked;
  run.phase = picked.kind === 'rest' ? 'rest' : 'battle';
}

/** Enemy level for a node: the crew's Rank, rising a little each floor and for elites and bosses. */
export function nodeLevel(run: DescentRun, n: DescentNode): number {
  return Math.max(1, run.rank + n.floor + (n.kind === 'elite' ? 1 : 0) + (n.kind === 'boss' ? 1 : 0));
}

export function partyPassives(run: DescentRun, deps: DescentDeps): Passive[] {
  return run.glimmers.flatMap((id) => deps.glimmer(id).passives);
}

export interface DescentBattle {
  setup: BattleSetup;
  seed: string;
  node: DescentNode;
}

/** The battle for the node being played, with HP carried over and Glimmers applied. */
export function battleFor(run: DescentRun, deps: DescentDeps): DescentBattle {
  const n = run.node;
  if (!n || run.phase !== 'battle' || !n.encounter) throw new Error('No battle is waiting');
  const party = run.crew.map((c) => {
    const card = c.card ? deps.card(c.card) : undefined;
    const passives = card ? cardPassives(card, c.copies) : [];
    return heroUnit(deps.hero(c.hero), run.rank, c.resonance, passives, { hpPct: Math.max(REVIVE_HP, run.hp[c.hero] ?? 1) });
  });
  return {
    setup: {
      party,
      foes: encounterFoes(deps.encounter(n.encounter), nodeLevel(run, n), deps.enemy),
      partyPassives: partyPassives(run, deps),
    },
    seed: deriveSeed(run.seed, 'battle', n.id).toString(36),
    node: n,
  };
}

const RARITY_WEIGHTS: Record<NodeKind, [number, number, number]> = {
  battle: [6, 3, 1],
  elite: [3, 4, 2],
  boss: [1, 4, 4],
  rest: [1, 1, 1],
};

/** Three Glimmers to choose from. Rarer ones come after harder fights, and chosen Paths come up more. */
export function offerGlimmers(run: DescentRun, deps: DescentDeps, n: DescentNode): string[] {
  const rng = new Rng(deriveSeed(run.seed, 'offer', n.id));
  const taken = new Set(run.glimmers);
  const pool = deps.glimmers().filter((g) => !taken.has(g.id));
  const weights = RARITY_WEIGHTS[n.kind];
  const out: string[] = [];
  const remaining = [...pool];
  while (out.length < 3 && remaining.length > 0) {
    const pick = rng.weighted(
      remaining.map((g) => ({ weight: weights[g.rarity - 1]! * (1 + run.pathScore[g.path as PathId]), value: g })),
    );
    out.push(pick.id);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return out;
}

export interface BattleOutcome {
  victory: boolean;
  /** HP as a fraction of max, by hero id, at the end of the fight. */
  hp: Record<string, number>;
  actions: number;
}

export function finishBattle(run: DescentRun, deps: DescentDeps, outcome: BattleOutcome): void {
  const n = run.node;
  if (!n || run.phase !== 'battle') throw new Error('No battle is in progress');
  run.stats.actions += outcome.actions;
  if (!outcome.victory) {
    run.phase = 'done';
    run.result = 'failed';
    return;
  }
  run.stats.battles++;
  for (const c of run.crew) {
    const after = outcome.hp[c.hero] ?? run.hp[c.hero] ?? 1;
    run.hp[c.hero] = after <= 0 ? REVIVE_HP : Math.min(1, after + BATTLE_HEAL);
  }
  if (n.kind === 'boss') {
    run.stats.floorsCleared++;
    for (const c of run.crew) run.hp[c.hero] = Math.min(1, (run.hp[c.hero] ?? 1) + FLOOR_HEAL);
  }
  const offer = offerGlimmers(run, deps, n);
  if (offer.length === 0) {
    // Every Glimmer is already taken: nothing to choose, so carry straight on.
    advance(run);
    return;
  }
  run.offer = offer;
  run.phase = 'glimmer';
}

function advance(run: DescentRun): void {
  const n = run.node;
  run.node = null;
  run.offer = null;
  if (n?.kind === 'boss') {
    if (run.floor + 1 >= FLOORS) {
      run.phase = 'done';
      run.result = 'cleared';
      return;
    }
    run.floor++;
    run.step = 0;
  } else {
    run.step++;
  }
  run.phase = 'choose';
}

export function pickGlimmer(run: DescentRun, deps: DescentDeps, id: string): void {
  if (run.phase !== 'glimmer' || !run.offer?.includes(id)) throw new Error(`${id} is not on offer`);
  run.glimmers.push(id);
  run.pathScore[deps.glimmer(id).path]++;
  if (run.node === null) {
    // The opening choice: nothing has been played yet, so just begin.
    run.offer = null;
    run.phase = 'choose';
    return;
  }
  advance(run);
}

export function takeRest(run: DescentRun): void {
  if (run.phase !== 'rest') throw new Error('There is no rest to take');
  for (const c of run.crew) run.hp[c.hero] = Math.min(1, (run.hp[c.hero] ?? 1) + REST_HEAL);
  advance(run);
}

export interface RunRewards {
  /** Gloam for floors and the clear, subject to the weekly cap. */
  floorGloam: number;
  xp: number;
}

export function runRewards(run: DescentRun): RunRewards {
  const cleared = run.result === 'cleared';
  return {
    floorGloam: run.stats.floorsCleared * FLOOR_GLOAM + (cleared ? CLEAR_GLOAM : 0),
    xp: run.stats.battles * XP_PER_BATTLE + run.stats.floorsCleared * XP_PER_FLOOR,
  };
}

/** Fraction of max HP the crew has left, for display. */
export function crewHpFrac(run: DescentRun): number {
  const values = run.crew.map((c) => run.hp[c.hero] ?? 1);
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}
