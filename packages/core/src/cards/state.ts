import type { RngState } from '../rng';
import type { Affinity } from '../types';
import type { CardDef, CardInstance, FoeMove, FoeSetup, FoeTier, Passive, StatusId } from './defs';

export type Statuses = Partial<Record<StatusId, number>>;

/** The hero's id in events and targets. */
export const HERO = 'hero';

export interface HeroState {
  id: string;
  name: string;
  affinity: Affinity;
  hp: number;
  maxHp: number;
  ward: number;
  gauge: number;
  statuses: Statuses;
  maxLight: number;
  handLimit: number;
  ultimate: string | null;
  ultimateUp: boolean;
  passives: Passive[];
}

export interface FoeState {
  id: string;
  defId: string;
  name: string;
  family: string;
  tier: FoeTier;
  slot: number;
  hp: number;
  maxHp: number;
  ward: number;
  shell: number;
  maxShell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  broken: boolean;
  /** Recovered from a Break and has not acted since: weakness hits do not chip Shell. */
  hardened: boolean;
  alive: boolean;
  statuses: Statuses;
  moves: FoeMove[];
  pattern: string[] | null;
  weights: Record<string, number> | null;
  aiIndex: number;
  opener: string | null;
  /** The move it will make next. Null while Broken. */
  intent: string | null;
  power: number;
}

export interface ChainState {
  affinity: Affinity | null;
  /** 0 for a lone card; 1 means the second card in a row, shown as Chain ×2. */
  steps: number;
}

export interface CardBattleStats {
  turns: number;
  cardsPlayed: number;
  damageDealt: number;
  damageTaken: number;
  blocked: number;
  /** Ward earned by holding cards, and how many cards were held. */
  heldWard: number;
  held: number;
  breaks: number;
  kos: number;
  maxChain: number;
  /** Times a Chain reached ×2. */
  chains: number;
  ultimates: number;
  healed: number;
  /** Cards played, by affinity ('none' for neutral) and by kind. */
  plays: Record<string, number>;
  kinds: Record<string, number>;
}

export interface CardBattleState {
  seed: string;
  rng: RngState;
  turn: number;
  hero: HeroState;
  foes: FoeState[];
  light: number;
  /** The top of the draw pile is the end of the array. */
  draw: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  spent: CardInstance[];
  /** Shared and never changed during a fight, so clones can share them. */
  cards: Record<string, CardDef>;
  summons: Record<string, FoeSetup>;
  chain: ChainState;
  playedThisTurn: number;
  /** Ward each held card gave at the end of the last turn, so Shatter can break the best of it. */
  heldWards: Array<{ uid: number; ward: number }>;
  nextUid: number;
  summoned: number;
  over: boolean;
  result: 'victory' | 'defeat' | null;
  stats: CardBattleStats;
}

/** Everything the engine reports, in order, so the client can animate it. */
export type CardEvent =
  | { t: 'turn'; turn: number; light: number }
  | { t: 'draw'; uids: number[] }
  | { t: 'shuffle'; count: number }
  | { t: 'play'; uid: number; id: string; target: string | null; light: number; to: 'discard' | 'spent' }
  | { t: 'chain'; steps: number; affinity: Affinity | null }
  | {
      t: 'hit';
      target: string;
      amount: number;
      blocked: number;
      hp: number;
      ward: number;
      shell: number;
      weak: boolean;
      resist: boolean;
    }
  | { t: 'crack'; unit: string; shell: number }
  | { t: 'break'; unit: string }
  | { t: 'recover'; unit: string; shell: number }
  | { t: 'ko'; unit: string }
  | { t: 'status'; unit: string; status: StatusId; stacks: number }
  | { t: 'heal'; unit: string; amount: number; hp: number }
  | { t: 'ward'; unit: string; value: number }
  | { t: 'light'; value: number }
  | { t: 'gauge'; value: number }
  | { t: 'ultimate'; uid: number; id: string }
  | { t: 'held'; uids: number[]; ward: number }
  | { t: 'spend'; uids: number[] }
  | { t: 'discard'; uids: number[] }
  | { t: 'foeTurn'; unit: string }
  | { t: 'move'; unit: string; move: string; name: string }
  | { t: 'heroHit'; from: string; amount: number; blocked: number; hp: number; ward: number }
  | { t: 'burn'; unit: string; amount: number; hp: number }
  | { t: 'skip'; unit: string }
  | { t: 'intent'; unit: string; move: string | null }
  | { t: 'curse'; count: number }
  | { t: 'shatter'; uid: number; lost: number; ward: number }
  | { t: 'summon'; unit: string }
  | { t: 'late' }
  | { t: 'end'; result: 'victory' | 'defeat' };
