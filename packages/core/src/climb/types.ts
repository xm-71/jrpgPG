import type { CardDef, CardInstance } from '../cards/defs';
import type { PlayStyle } from '../cards/echo';
import type { CardBattleStats } from '../cards/state';
import type { EncounterDef, EventDef, FoeDef, GlimmerDef, HeroDef, StratumDef } from '../data';

/** The climb: a run up one stratum of the Gnomon, three floors of branching paths. */

export type PathId = GlimmerDef['path'];
export const PATHS: readonly PathId[] = ['noonward', 'duskward', 'nightward'];

export type NodeKind = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'mirror' | 'guardian' | 'boss';
export const FIGHT_KINDS: readonly NodeKind[] = ['battle', 'elite', 'guardian', 'boss'];

export interface MapNode {
  id: string;
  kind: NodeKind;
  row: number;
  /** 0, 1 or 2: left, middle, right. */
  col: number;
  /** Ids of the nodes this one leads to. */
  next: string[];
  encounter: string | null;
  event: string | null;
}

export interface FloorMap {
  floor: number;
  rows: MapNode[][];
}

/** Everything the climb needs from content. */
export interface ClimbDeps {
  hero(id: string): HeroDef;
  card(id: string): CardDef | undefined;
  foe(id: string): FoeDef;
  encounter(id: string): EncounterDef;
  glimmer(id: string): GlimmerDef;
  glimmers(): readonly GlimmerDef[];
  event(id: string): EventDef;
  stratum(index: number): StratumDef;
  /** Cards any hero can find: the common pool. */
  pool(): readonly CardDef[];
}

export type ClimbPhase = 'glimmer' | 'map' | 'battle' | 'reward' | 'event' | 'shop' | 'rest' | 'mirror' | 'pick' | 'done';

export interface ShopItem {
  kind: 'card' | 'glimmer' | 'remove' | 'heal';
  id: string | null;
  price: number;
  sold: boolean;
  up?: boolean;
}

export interface Reward {
  embers: number;
  /** Cards on offer, with a flag for ones that come already tempered. */
  cards: Array<{ id: string; up: boolean }>;
  /** A card was taken or the offer was passed. */
  cardDone: boolean;
  /** Glimmers to choose from after the card, for elites, guardians and bosses. */
  glimmers: string[] | null;
}

export type PickMode = 'remove' | 'upgrade' | 'duplicate';

/** What happens after an event's text, if anything. */
export type EventFollow = { type: 'fight'; encounter: string } | { type: 'glimmer' } | { type: 'pick'; mode: PickMode } | { type: 'echo' };

export interface ClimbRun {
  v: 2;
  seed: string;
  /** The day key when this is the daily climb. */
  daily: string | null;
  stratum: number;
  hero: string;
  resonance: number;
  floors: FloorMap[];
  floor: number;
  /** The node the climber stands on. Null at the foot of a floor. */
  at: string | null;
  visited: string[];
  hp: number;
  maxHp: number;
  embers: number;
  deck: CardInstance[];
  nextUid: number;
  glimmers: string[];
  pathScore: Record<PathId, number>;
  /** Echo cards this run knows: generated at Mirrors, or brought from the archive. */
  echoes: CardDef[];
  echoCount: number;
  /** Ids of Echoes brought from the archive; they can turn up as rewards. */
  archived: string[];
  /** Kindled cards the climber owns, with how many copies, so rewards can offer them. */
  kindled: Record<string, number>;
  phase: ClimbPhase;
  node: MapNode | null;
  glimmerOffer: string[] | null;
  reward: Reward | null;
  shop: ShopItem[] | null;
  removePrice: number;
  event: { id: string; choice: number | null; text: string | null; follow: EventFollow | null } | null;
  mirror: CardDef[] | null;
  /** Choosing a card from the deck: for a removal at the shop, tempering at a rest, or an event. */
  pick: { mode: PickMode; back: 'shop' | 'advance'; shopIndex?: number } | null;
  /** A fight waiting to be played. */
  battle: { encounter: string; kind: NodeKind; seed: string } | null;
  style: PlayStyle;
  usedEvents: string[];
  result: 'cleared' | 'failed' | null;
  stats: {
    battles: number;
    elites: number;
    floorsCleared: number;
    turns: number;
    breaks: number;
    echoesTaken: number;
    reachedFloor: number;
  };
}

export interface ClimbBattleResult {
  victory: boolean;
  hp: number;
  stats: CardBattleStats;
}
