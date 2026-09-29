/** Kindling: the in-game gacha. Pulls are paid with Gloam, a currency earned by playing. */

export type PullRarity = 3 | 4 | 5;

export interface FiveStarRules {
  /** Chance of a 5-star on any pull before pity applies. */
  base: number;
  /** Soft pity starts at this many pulls since the last 5-star (0 turns it off). */
  softStart: number;
  /** Extra chance added for each pull from `softStart` onward. */
  softStep: number;
  /** The pull count at which a 5-star is guaranteed (0 turns it off). */
  hard: number;
}

export interface BannerRules {
  five: FiveStarRules;
  four: {
    /** Chance of a 4-star on any pull that is not a 5-star. */
    base: number;
    /** At least one 4-star or better in every this many pulls. */
    every: number;
  };
  /** Chance that a 5-star is a featured one, when no guarantee is active. */
  featuredShare: number;
  /** After a 5-star that was not featured, the next 5-star is. */
  guaranteeAfterMiss: boolean;
  /** Spark: enough pulls on one banner lets the player choose a featured 5-star. */
  spark?: { at: number };
}

export interface BannerDef {
  id: string;
  name: string;
  tagline: string;
  /** Banners in the same group share pity counters. */
  pityGroup: string;
  rules: BannerRules;
  /** Everything the banner can give apart from its featured items, by rarity. */
  pool: { five: string[]; four: string[]; three: string[] };
  /** Rate-up items. Empty for the standard banner. */
  featured: { five: string[]; four: string[] };
  /** Chance that a 4-star is one of the featured 4-stars, when there are any. */
  featuredFourShare: number;
  cost: { single: number; ten: number };
}

export interface PityCounters {
  /** Pulls since the last 5-star. */
  five: number;
  /** Pulls since the last 4-star or better. */
  four: number;
  /** The next 5-star is guaranteed to be featured. */
  guaranteed: boolean;
}

export interface PullRecord {
  /** 1-based running pull number across every banner. */
  n: number;
  banner: string;
  item: string;
  rarity: PullRarity;
  featured: boolean;
  /** Milliseconds since the epoch. */
  at: number;
}

export interface KindlingState {
  pity: Record<string, PityCounters>;
  /** Pulls made on each banner, spent by the spark exchange. */
  spark: Record<string, number>;
  history: PullRecord[];
  totalPulls: number;
}

export type PityKind = 'none' | 'soft' | 'hard' | 'four';

export interface PullResult {
  n: number;
  banner: string;
  item: string;
  rarity: PullRarity;
  /** The item is one of the banner's featured items. */
  featured: boolean;
  /** What lifted the odds on this pull. */
  pity: PityKind;
  /** The featured 5-star came from the guarantee rather than the roll. */
  viaGuarantee: boolean;
  /** Pulls since the last 5-star, counting this one. */
  sinceFive: number;
}
