import type { RngState } from '../rng';
import type { Affinity, Side, Stats } from '../types';
import type { EnemyAi, Kit, ModStat, Passive, SkillDef, Tier } from './defs';

export interface Mod {
  key: string;
  stat: ModStat | 'taunt';
  /** Fraction, so 0.25 is +25% and -0.2 is -20%. */
  pct: number;
  /** Own turns remaining. */
  turns: number;
  /** Applied during the owner's current turn, so it should not tick down at the end of it. */
  fresh: boolean;
}

export interface Intent {
  skill: string;
  target: string | null;
}

export interface Unit {
  id: string;
  defId: string;
  name: string;
  side: Side;
  slot: number;
  tier: Tier;
  affinity: Affinity | null;
  /** Combat stats after passives. hp here is max HP. */
  stats: Stats;
  hp: number;
  maxHp: number;
  shell: number;
  maxShell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  broken: boolean;
  /** Recovered from a Break and has not acted yet: weakness hits deal no Shell damage. */
  hardened: boolean;
  gauge: number;
  mods: Mod[];
  guarding: boolean;
  /** Timeline position: the lowest value acts next. */
  nextAt: number;
  alive: boolean;
  kit: Kit | null;
  foeKit: SkillDef[];
  ai: EnemyAi | null;
  aiIndex: number;
  intent: Intent | null;
  passives: Passive[];
}

export type BattleResult = 'victory' | 'defeat';

export type Awaiting =
  | { type: 'input'; actor: string; mode: 'turn' | 'encore' | 'passed' }
  | { type: 'over' };

/** The run of actions that starts on one party member's turn and can pass between allies. */
export interface Chain {
  originator: string;
  current: string;
  /** Units that already had a slot in this chain. */
  used: string[];
  passCount: number;
  /** Actions taken in the current slot. */
  slotActions: number;
  /** The current unit has spent its Encore. */
  encoreUsed: boolean;
  /** Time cost of the originator's last action. */
  lastTimeCost: number;
}

export interface BattleStats {
  turns: number;
  /** Enemy turns where the enemy acted, and where it lost its turn to a Break. */
  foeActions: number;
  foeSkips: number;
  breaks: number;
  weakHits: number;
  encores: number;
  passes: number;
  bursts: number;
  ultimates: number;
  crits: number;
  kos: number;
  partyKos: number;
  damageDealt: number;
  damageTaken: number;
  healed: number;
}

export interface BattleState {
  seed: string | number;
  rng: RngState;
  now: number;
  turnCount: number;
  units: Unit[];
  lantern: number;
  awaiting: Awaiting;
  chain: Chain | null;
  /** Whose turn is being resolved, for the "fresh" modifier rule. */
  turnOwner: string | null;
  result: BattleResult | null;
  stats: BattleStats;
}
