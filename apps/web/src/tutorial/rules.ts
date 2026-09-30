import { STANDARD_BANNER, rateUpBanner } from '@duskline/content';

/**
 * Numbers the tutorial quotes, read from the game itself so the words and the engine cannot drift apart.
 * Everything else the lessons and the guide say about a rule comes straight from `@duskline/core`.
 */

/** A multiplier or fraction as a percentage: 0.25 becomes "25%". */
export const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** Pulls since the last ★5 after which the next one is guaranteed. */
export const PITY = STANDARD_BANNER.rules.five.hard;

/** Pulls on a rate-up banner after which the featured ★5 can be chosen. */
export const SPARK = rateUpBanner(0).rules.spark?.at ?? 0;
