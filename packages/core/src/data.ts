import type { CardDef, FoeMove, FoeTier, Passive } from './cards/defs';
import type { Affinity, Rarity, Role } from './types';

/**
 * Shapes of the game's data. The content package fills them in; core code takes the data as
 * arguments, so the rules never import content and content can be edited without touching rules.
 */

/** Parameters for the procedural figures, until commissioned art replaces them. */
/** The manga tradition a hero is drawn in. The style guide explains each one. */
export type MangaStyle = 'shonen' | 'rival' | 'sukeban' | 'kunoichi' | 'bishonen' | 'chibi' | 'seinen' | 'showa' | 'shoujo' | 'gekiga' | 'majokko' | 'yokai';

/** A face for the moment. Story lines and fights pick one. */
export type Mood = 'calm' | 'fierce' | 'hurt' | 'smile' | 'shock';

export type HairStyle = 'spiky' | 'hime' | 'regent' | 'bob' | 'flowing' | 'puff' | 'windswept' | 'explorer' | 'curls' | 'crop' | 'twintails' | 'hooded';

/** Costume pieces drawn over a hero's base outfit. */
export type Wear =
  | 'scarf'
  | 'coat'
  | 'draped'
  | 'plaster'
  | 'longskirt'
  | 'mask'
  | 'wraps'
  | 'tattoos'
  | 'headband'
  | 'armor'
  | 'goggles'
  | 'overalls'
  | 'cloak'
  | 'hat'
  | 'satchel'
  | 'epaulettes'
  | 'tiara'
  | 'apron'
  | 'beard'
  | 'witchhat'
  | 'frills'
  | 'haori'
  | 'gloves';

export type Prop = 'lantern' | 'blade' | 'rail' | 'needle' | 'greatsword' | 'kite' | 'baton' | 'buoy' | 'compass' | 'wire' | 'trowel' | 'chochin';

export interface Look {
  /** Relative body height, about 0.85 to 1.15. */
  height: number;
  style: MangaStyle;
  hair: HairStyle;
  hairColor: string;
  skin: string;
  eyes: string;
  outfit: string;
  /** A second outfit colour: shirts, linings, skirts. */
  under: string;
  accent: string;
  prop: Prop;
  wear: Wear[];
  cape?: boolean;
}

/** A Lamplighter. Each climbs alone, with a deck of their own. */
export interface HeroDef {
  id: string;
  name: string;
  title: string;
  /** Story heroes join through the story. Afterlights come from Kindling. */
  origin: 'story' | 'afterlight';
  rarity: Rarity;
  role: Role;
  affinity: Affinity;
  /** Max HP at Resonance 1 and Rank 1. */
  hp: number;
  /** The deck every climb starts with. */
  starter: string[];
  /** Cards that only turn up in this hero's rewards. */
  signature: string[];
  /** Conjured into hand when the gauge fills. */
  ultimate: string;
  /** The hero's passive, always on. */
  trait: { name: string; passives: Passive[] };
  /** Which Turning an Afterlight comes from. */
  turning?: string;
  blurb: string;
  quote: string;
  look: Look;
}

export type FoeFamily = 'wisp' | 'hound' | 'wraith' | 'husk' | 'choir' | 'static' | 'warden' | 'moth' | 'acolyte' | 'bell' | 'keeper';

export interface FoeDef {
  id: string;
  name: string;
  family: FoeFamily;
  tier: FoeTier;
  hp: number;
  shell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  moves: FoeMove[];
  pattern?: string[];
  weights?: Record<string, number>;
  opener?: string;
  blurb: string;
  /** Drawing scale for the silhouette. */
  scale: number;
  /** The card you can bind from it after a win. */
  bind?: string;
}

export interface FoeSpawn {
  foe: string;
  /** Multipliers for one fight, on top of the stratum's scaling. */
  hp?: number;
  power?: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  foes: FoeSpawn[];
  /** Foes the encounter can summon. */
  summons?: string[];
}

export interface FloorDef {
  /** Ordinary fights on this floor. */
  battles: string[];
  /** The fight that ends the floor. On the last floor, the stratum's boss. */
  guardian: string;
}

/** A third of the Gnomon: three floors and a boss. */
export interface StratumDef {
  id: string;
  index: number;
  name: string;
  blurb: string;
  floors: FloorDef[];
  elites: string[];
  events: string[];
  /** Foe HP and power multipliers for the whole stratum. */
  hpScale: number;
  powerScale: number;
  /** The first floor (0-based) whose maps may hold elites. Leave it out to allow them from the start. */
  eliteFrom?: number;
}

export interface GlimmerDef {
  id: string;
  name: string;
  path: 'noonward' | 'duskward' | 'nightward';
  rarity: 1 | 2 | 3;
  text: string;
  passives: Passive[];
}

export type EventOutcome =
  | { type: 'hp'; amount: number }
  | { type: 'maxHp'; amount: number }
  | { type: 'embers'; amount: number }
  | { type: 'card'; card: string }
  | { type: 'randomCard'; tier: 'common' | 'uncommon' | 'rare' }
  | { type: 'curse'; count: number }
  | { type: 'glimmer' }
  | { type: 'pick'; mode: 'remove' | 'upgrade' | 'duplicate' }
  | { type: 'upgradeRandom'; count: number }
  | { type: 'fight'; encounter: string }
  | { type: 'echo' }
  | { type: 'chance'; p: number; win: EventOutcome[]; lose: EventOutcome[]; winText: string; loseText: string };

export interface EventChoice {
  label: string;
  /** What the player can see of the result before choosing. */
  hint: string;
  cost?: { embers?: number; hp?: number };
  outcome: EventOutcome[];
  /** Shown after choosing, unless a chance roll has its own text. */
  after: string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export interface DialogueLine {
  /** A hero id, a foe name, or 'narrator'. */
  who: string;
  text: string;
  /** The speaker's face on this line. */
  mood?: Mood;
}

export type BeatTrigger =
  | { type: 'start' }
  | { type: 'firstClimbEnd' }
  | { type: 'reachFloor'; stratum: number; floor: number }
  | { type: 'clearStratum'; stratum: number };

/** A story scene between climbs. */
export interface BeatDef {
  id: string;
  chapter: number;
  title: string;
  trigger: BeatTrigger;
  lines: DialogueLine[];
  /** One-off Gloam for seeing it. */
  gloam?: number;
  /** Heroes who join the crew. */
  unlocks?: string[];
  sky?: 'dusk' | 'night' | 'noon';
}

export type { CardDef };
