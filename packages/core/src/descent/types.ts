import type { Passive } from '../battle/defs';

/** The Descent: a short roguelite run through the Umbral Reach. Three floors, boons called Glimmers. */

export type PathId = 'noonward' | 'duskward' | 'nightward';
export const PATHS: readonly PathId[] = ['noonward', 'duskward', 'nightward'];

export interface GlimmerDef {
  id: string;
  name: string;
  path: PathId;
  rarity: 1 | 2 | 3;
  text: string;
  passives: Passive[];
}

export type NodeKind = 'battle' | 'elite' | 'rest' | 'boss';

export interface DescentNode {
  id: string;
  kind: NodeKind;
  floor: number;
  step: number;
  /** Encounter id. Null for a rest. */
  encounter: string | null;
}

/** Encounter ids the generator can draw from. */
export interface DescentPools {
  normal: string[];
  elite: string[];
  /** One per floor. */
  boss: string[];
}

/** A hero as they enter the run, frozen so the run does not depend on later changes to the profile. */
export interface CrewMember {
  hero: string;
  resonance: number;
  card: string | null;
  copies: number;
}

export type DescentPhase = 'choose' | 'battle' | 'rest' | 'glimmer' | 'done';

export interface DescentRun {
  v: 1;
  seed: string;
  /** The day key when this is the daily seed, so the daily bonus can be paid once. */
  daily: string | null;
  crew: CrewMember[];
  rank: number;
  floors: DescentNode[][][];
  floor: number;
  step: number;
  /** The node being played. */
  node: DescentNode | null;
  /** HP as a fraction of max, by hero id. */
  hp: Record<string, number>;
  glimmers: string[];
  pathScore: Record<PathId, number>;
  offer: string[] | null;
  phase: DescentPhase;
  result: 'cleared' | 'failed' | null;
  stats: { battles: number; floorsCleared: number; actions: number };
}
