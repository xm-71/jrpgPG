import { fiveRate } from './pull';
import type { BannerRules } from './types';

/**
 * Exact odds for a banner's rules, by dynamic programming over (pulls since the last 5-star,
 * whether the next 5-star is guaranteed to be featured). This is what the in-game Odds page shows,
 * and the tests check the real pull code against it.
 */

export interface BannerAnalysis {
  /** Average pulls per 5-star of any kind, in the long run. */
  avgPullsPerFive: number;
  /** Average pulls to the first featured 5-star from a fresh start, with the spark as a backstop. */
  avgPullsToFeatured: number;
  /** Overall share of 5-stars that are featured, in the long run. */
  featuredShareOverall: number;
  /** CDF indexed by pull count: chance of holding a featured 5-star by that pull. */
  featuredCdf: number[];
  /** CDF indexed by pull count: chance of holding any 5-star by that pull. */
  anyCdf: number[];
  medianToFeatured: number | null;
  p90ToFeatured: number | null;
  /** The pull by which the featured 5-star is certain, if the rules guarantee one. */
  worstCaseToFeatured: number | null;
}

const HORIZON = 5000;

function quantile(cdf: number[], q: number): number | null {
  for (let t = 1; t < cdf.length; t++) if ((cdf[t] as number) >= q - 1e-12) return t;
  return null;
}

export function analyzeRules(rules: BannerRules, hasFeatured = true): BannerAnalysis {
  const five = rules.five;
  const spark = rules.spark?.at ?? 0;
  const feat = hasFeatured ? rules.featuredShare : 1;
  const guarantee = hasFeatured && rules.guaranteeAfterMiss;

  let kMax: number;
  if (five.hard > 0) kMax = five.hard;
  else if (five.softStart > 0 && five.softStep > 0) kMax = five.softStart - 1 + Math.ceil((1 - five.base) / five.softStep);
  else kMax = 1;
  kMax = Math.max(1, Math.min(kMax, HORIZON));
  const rate = (n: number): number => fiveRate(five, Math.min(n, kMax + 1));
  const tCap = spark > 0 ? spark : HORIZON;

  // Any 5-star.
  const anyCdf: number[] = [0];
  let surv = 1;
  for (let t = 1; t <= tCap; t++) {
    surv *= 1 - rate(t);
    anyCdf.push(spark > 0 && t === spark ? 1 : 1 - surv);
    if (spark === 0 && surv < 1e-9) break;
  }
  let avgAny = 0;
  surv = 1;
  for (let t = 1; t <= 20_000; t++) {
    avgAny += surv;
    surv *= 1 - rate(t);
    if (surv < 1e-12) break;
  }

  // The featured 5-star.
  let cur0 = new Float64Array(kMax + 1);
  let cur1 = new Float64Array(kMax + 1);
  cur0[0] = 1;
  const featuredCdf: number[] = [0];
  let got = 0;
  let mean = 0;
  for (let t = 1; t <= tCap; t++) {
    const n0 = new Float64Array(kMax + 1);
    const n1 = new Float64Array(kMax + 1);
    let hit = 0;
    for (let k = 0; k <= kMax; k++) {
      const m0 = cur0[k] as number;
      if (m0 > 0) {
        const r = rate(k + 1);
        hit += m0 * r * feat;
        if (guarantee) n1[0] = (n1[0] as number) + m0 * r * (1 - feat);
        else n0[0] = (n0[0] as number) + m0 * r * (1 - feat);
        const to = Math.min(k + 1, kMax);
        n0[to] = (n0[to] as number) + m0 * (1 - r);
      }
      const m1 = cur1[k] as number;
      if (m1 > 0) {
        const r = rate(k + 1);
        hit += m1 * r;
        const to = Math.min(k + 1, kMax);
        n1[to] = (n1[to] as number) + m1 * (1 - r);
      }
    }
    let rest = 0;
    for (let k = 0; k <= kMax; k++) rest += (n0[k] as number) + (n1[k] as number);
    if (spark > 0 && t === spark) {
      hit += rest;
      rest = 0;
    }
    got += hit;
    mean += t * hit;
    featuredCdf.push(Math.min(1, got));
    cur0 = n0;
    cur1 = n1;
    if (spark === 0 && rest < 1e-9) break;
  }

  const worst = spark > 0 ? spark : guarantee && five.hard > 0 ? 2 * five.hard : feat >= 1 && five.hard > 0 ? five.hard : null;

  return {
    avgPullsPerFive: avgAny,
    avgPullsToFeatured: mean,
    featuredShareOverall: hasFeatured ? (guarantee ? 1 / (2 - feat) : feat) : 1,
    featuredCdf,
    anyCdf,
    medianToFeatured: quantile(featuredCdf, 0.5),
    p90ToFeatured: quantile(featuredCdf, 0.9),
    worstCaseToFeatured: worst,
  };
}

/** Chance that pull number `sinceFive + 1` is a 5-star, given how many pulls have passed since the last. */
export function nextPullFiveChance(rules: BannerRules, sinceFive: number): number {
  return fiveRate(rules.five, sinceFive + 1);
}

/** Chance of a 4-star on the next pull, given the current counters. */
export function nextPullFourChance(rules: BannerRules, sinceFive: number, sinceFour: number): number {
  const p5 = fiveRate(rules.five, sinceFive + 1);
  if (sinceFour + 1 >= rules.four.every) return 1 - p5;
  return Math.min(1 - p5, rules.four.base);
}
