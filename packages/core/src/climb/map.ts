import { Rng, deriveSeed } from '../rng';
import type { StratumDef } from '../data';
import type { FloorMap, MapNode, NodeKind } from './types';

/** Rows of choices on a floor, before the guardian or boss that ends it. */
export const CHOICE_ROWS = 4;
export const FLOORS = 3;

const ROW_WEIGHTS: ReadonlyArray<Partial<Record<NodeKind, number>>> = [
  { battle: 1 },
  { battle: 45, event: 35, mirror: 20 },
  { battle: 20, event: 30, shop: 25, rest: 25 },
  { elite: 35, battle: 30, rest: 20, mirror: 15 },
];

/** Kinds a floor should never be without, and the rows they may appear in. */
const GUARANTEES: ReadonlyArray<{ kind: NodeKind; rows: number[] }> = [
  { kind: 'rest', rows: [2, 3] },
  { kind: 'shop', rows: [1, 2, 3] },
  { kind: 'mirror', rows: [1, 2, 3] },
];

const UNIQUE_IN_ROW: ReadonlySet<NodeKind> = new Set(['shop', 'rest', 'mirror', 'elite']);

function pickKind(rng: Rng, weights: Partial<Record<NodeKind, number>>): NodeKind {
  return rng.weighted(Object.entries(weights).map(([k, w]) => ({ weight: w ?? 0, value: k as NodeKind })));
}

/**
 * One floor: four rows of two or three nodes, then the guardian (or, on the last floor, the boss).
 * Each node leads to the nodes above it within one column, so paths cross and split.
 */
export function generateFloor(seed: string, stratum: StratumDef, floor: number, usedEvents: Set<string>): FloorMap {
  const rng = new Rng(deriveSeed('floor', seed, stratum.id, floor));
  const def = stratum.floors[floor];
  if (!def) throw new Error(`${stratum.id} has no floor ${floor}`);
  const rows: MapNode[][] = [];
  for (let r = 0; r < CHOICE_ROWS; r++) {
    const count = r === 0 ? 2 : rng.chance(0.55) ? 3 : 2;
    const cols = count === 3 ? [0, 1, 2] : rng.pick([[0, 1], [1, 2], [0, 2]] as const);
    const row: MapNode[] = [];
    for (const col of cols) {
      let kind = pickKind(rng, ROW_WEIGHTS[r]!);
      if (kind === 'elite' && floor < (stratum.eliteFrom ?? 0)) kind = 'battle';
      if (UNIQUE_IN_ROW.has(kind) && row.some((n) => n.kind === kind)) kind = r === 0 ? 'battle' : rng.pick(['battle', 'event'] as const);
      row.push({ id: `f${floor}r${r}c${col}`, kind, row: r, col, next: [], encounter: null, event: null });
    }
    rows.push(row);
  }

  for (const g of GUARANTEES) {
    const has = g.rows.some((r) => rows[r]!.some((n) => n.kind === g.kind));
    if (has) continue;
    const spots = g.rows.flatMap((r) => rows[r]!.filter((n) => n.kind === 'battle' || n.kind === 'event'));
    if (spots.length > 0) rng.pick(spots).kind = g.kind;
  }

  const last = floor === FLOORS - 1 ? 'boss' : 'guardian';
  rows.push([{ id: `f${floor}r${CHOICE_ROWS}c1`, kind: last, row: CHOICE_ROWS, col: 1, next: [], encounter: def.guardian, event: null }]);

  // Paths: each node reaches the nodes above it within one column; every node gets reached.
  for (let r = 0; r < rows.length - 1; r++) {
    const here = rows[r]!;
    const above = rows[r + 1]!;
    for (const n of here) {
      let targets = above.filter((m) => Math.abs(m.col - n.col) <= 1);
      if (targets.length === 0) targets = [above.reduce((a, b) => (Math.abs(b.col - n.col) < Math.abs(a.col - n.col) ? b : a))];
      n.next = targets.map((m) => m.id);
    }
    for (const m of above) {
      if (here.some((n) => n.next.includes(m.id))) continue;
      const from = here.reduce((a, b) => (Math.abs(b.col - m.col) < Math.abs(a.col - m.col) ? b : a));
      from.next.push(m.id);
    }
  }

  // Fill in what each node holds.
  const battlesUsed = new Set<string>();
  for (const row of rows) {
    for (const n of row) {
      if (n.kind === 'battle') {
        const fresh = def.battles.filter((e) => !battlesUsed.has(e));
        n.encounter = rng.pick(fresh.length > 0 ? fresh : def.battles);
        battlesUsed.add(n.encounter);
      } else if (n.kind === 'elite') {
        n.encounter = rng.pick(stratum.elites);
      } else if (n.kind === 'event') {
        const fresh = stratum.events.filter((e) => !usedEvents.has(e));
        n.event = rng.pick(fresh.length > 0 ? fresh : stratum.events);
        usedEvents.add(n.event);
      }
    }
  }
  return { floor, rows };
}

export function findNode(map: FloorMap, id: string): MapNode | undefined {
  for (const row of map.rows) for (const n of row) if (n.id === id) return n;
  return undefined;
}
