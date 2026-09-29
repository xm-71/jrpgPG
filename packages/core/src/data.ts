import type { EnemyAi, Kit, Passive, SkillDef, Tier } from './battle/defs';
import type { Affinity, Rarity, Role, Stats } from './types';

/**
 * Shapes of the game's data. The content package fills them in; core code takes the data as
 * arguments, so the rules never import content and content can be edited without touching rules.
 */

/** Parameters for the procedural placeholder figures, until commissioned art replaces them. */
export interface Look {
  /** Relative body height, about 0.85 to 1.15. */
  height: number;
  hair: 'short' | 'long' | 'ponytail' | 'spiky' | 'bob' | 'hooded' | 'crown';
  hairColor: string;
  skin: string;
  outfit: string;
  accent: string;
  prop: 'lantern' | 'blade' | 'rail' | 'needle' | 'greatsword' | 'kite' | 'staff' | 'bow' | 'orb' | 'anchor' | 'compass' | 'scroll' | 'wire' | 'trowel';
  cape?: boolean;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  /** Story heroes join through the campaign. Afterlights come from Kindling. */
  origin: 'story' | 'afterlight';
  rarity: Rarity;
  role: Role;
  affinity: Affinity;
  /** Stats at Rank 1. */
  base: Stats;
  kit: Kit;
  /** Which Turning an Afterlight comes from. */
  turning?: string;
  blurb: string;
  quote: string;
  look: Look;
}

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  blurb: string;
  /** Effect at one copy. Extra copies strengthen it. */
  passives: Passive[];
  art: { hue: number; glyph: 'lantern' | 'coat' | 'compass' | 'biscuit' | 'whistle' | 'ledger' | 'chime' | 'ribbon' | 'anchor' | 'sun' | 'key' };
}

export type FoeFamily = 'wisp' | 'hound' | 'wraith' | 'husk' | 'choir' | 'static' | 'warden';

export interface EnemyDef {
  id: string;
  name: string;
  family: FoeFamily;
  tier: Tier;
  /** Stats at level 1. */
  base: Stats;
  shell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  foeKit: SkillDef[];
  ai?: EnemyAi;
  blurb: string;
  /** Drawing scale for the placeholder silhouette. */
  scale: number;
}

export interface FoeSpawn {
  enemy: string;
  /** Level offset from the stage or floor level. Default 0. */
  levelOffset?: number;
  /** Multipliers on the enemy's HP and attack, to tune one fight without editing the enemy. */
  hpMult?: number;
  atkMult?: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  foes: FoeSpawn[];
}

export interface DialogueLine {
  /** A hero id, a foe name, or 'narrator'. */
  who: string;
  text: string;
}

export interface StageDef {
  id: string;
  chapter: number;
  name: string;
  blurb: string;
  /** Enemy level. Heroes fight at the player's Lamplighter Rank. */
  level: number;
  encounter: string;
  /** Hero ids the player must field, for tutorial fights. */
  forcedParty?: string[];
  firstClearGloam: number;
  xp: number;
  /** Hero ids that join the crew when this stage is first cleared. */
  unlocks?: string[];
  before: DialogueLine[];
  after: DialogueLine[];
}
