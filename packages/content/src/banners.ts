import type { BannerDef, BannerRules } from '@duskline/core';

/**
 * Kindling banners. Everything is bought with Gloam, a currency earned by playing.
 * One standard banner is always available. One rate-up banner rotates every six weeks,
 * cycling through the launch 5-star Afterlights, and each one comes back around.
 */

export const BANNER_EPOCH = Date.UTC(2026, 8, 28); // Monday, 28 September 2026
export const CYCLE_MS = 42 * 24 * 60 * 60 * 1000;

export const PULL_COST = { single: 100, ten: 1000 } as const;

const FIVE = { base: 0.02, softStart: 45, softStep: 0.065, hard: 60 } as const;
const FOUR = { base: 0.12, every: 10 } as const;

const RATE_UP_RULES: BannerRules = {
  five: { ...FIVE },
  four: { ...FOUR },
  featuredShare: 0.6,
  guaranteeAfterMiss: true,
  spark: { at: 120 },
};

const STANDARD_RULES: BannerRules = {
  five: { ...FIVE },
  four: { ...FOUR },
  featuredShare: 1,
  guaranteeAfterMiss: false,
};

const FIVE_HEROES = ['ysolde', 'kestrel', 'sable'] as const;
const FIVE_CARDS = ['card.anchor-shadow', 'card.first-light'] as const;
const FOUR_HEROES = ['brannoch', 'nim', 'ondrej'] as const;
const FOUR_CARDS = ['card.ledger', 'card.chime', 'card.ribbon', 'card.key'] as const;
const THREE_CARDS = [
  'card.worn-lantern',
  'card.patchwork-coat',
  'card.rusty-compass',
  'card.salt-biscuit',
  'card.tin-whistle',
] as const;

/** Every item Kindling can give, by rarity. */
export const KINDLING_ITEMS = {
  five: [...FIVE_HEROES, ...FIVE_CARDS],
  four: [...FOUR_HEROES, ...FOUR_CARDS],
  three: [...THREE_CARDS],
} as const;

export const STANDARD_BANNER: BannerDef = {
  id: 'standard',
  name: 'Lamplight Hours',
  tagline: 'Always lit. Any of the launch Afterlights can answer.',
  pityGroup: 'standard',
  rules: STANDARD_RULES,
  pool: { five: [...KINDLING_ITEMS.five], four: [...KINDLING_ITEMS.four], three: [...KINDLING_ITEMS.three] },
  featured: { five: [], four: [] },
  featuredFourShare: 0,
  cost: { ...PULL_COST },
};

const RATE_UP_NAMES = [
  { name: "The Tidewarden's Lantern", tagline: 'Ysolde Marrow answers the call. Her buoy-light never went out.' },
  { name: 'The Last Cartographer', tagline: 'Kestrel Onwe redraws the map, one impossible road at a time.' },
  { name: 'Requiem for Noon', tagline: 'Sable Ardent raises her baton. Ten thousand voices remember her.' },
] as const;

/** The rate-up banner for a given cycle number. */
export function rateUpBanner(cycle: number): BannerDef {
  const k = ((cycle % 3) + 3) % 3;
  const five = FIVE_HEROES[k]!;
  const fours = [FOUR_HEROES[k]!, FOUR_HEROES[(k + 1) % 3]!];
  const names = RATE_UP_NAMES[k]!;
  return {
    id: `rateup-${cycle}`,
    name: names.name,
    tagline: names.tagline,
    pityGroup: 'featured',
    rules: RATE_UP_RULES,
    pool: {
      five: KINDLING_ITEMS.five.filter((id) => id !== five),
      four: KINDLING_ITEMS.four.filter((id) => !fours.includes(id as never)),
      three: [...KINDLING_ITEMS.three],
    },
    featured: { five: [five], four: fours },
    featuredFourShare: 0.5,
    cost: { ...PULL_COST },
  };
}

/** Which rate-up cycle a moment falls in. Before the epoch counts as cycle 0. */
export function cycleAt(now: number): number {
  return Math.max(0, Math.floor((now - BANNER_EPOCH) / CYCLE_MS));
}

export interface ActiveBanners {
  cycle: number;
  standard: BannerDef;
  rateUp: BannerDef;
  startsAt: number;
  endsAt: number;
}

export function activeBanners(now: number, cycleOverride?: number): ActiveBanners {
  const cycle = cycleOverride ?? cycleAt(now);
  return {
    cycle,
    standard: STANDARD_BANNER,
    rateUp: rateUpBanner(cycle),
    startsAt: BANNER_EPOCH + cycle * CYCLE_MS,
    endsAt: BANNER_EPOCH + (cycle + 1) * CYCLE_MS,
  };
}

/** Look a banner up by id: "standard" or "rateup-<cycle>". */
export function bannerById(id: string): BannerDef | undefined {
  if (id === STANDARD_BANNER.id) return STANDARD_BANNER;
  const m = /^rateup-(\d+)$/.exec(id);
  return m ? rateUpBanner(Number(m[1])) : undefined;
}
