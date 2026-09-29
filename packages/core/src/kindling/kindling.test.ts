import { describe, expect, test } from 'vitest';
import { seedRng } from '../rng';
import { analyzeRules, nextPullFiveChance, nextPullFourChance } from './analysis';
import { DUPE_GLOAM, applyPullInPlace, newCollection, type ItemCatalog } from './collection';
import {
  SPARK_REFUND_PER_POINT,
  canRedeemSpark,
  expireBannerInPlace,
  fiveRate,
  newKindlingState,
  pull,
  pullInPlace,
  pullManyInPlace,
  redeemSparkInPlace,
  sparkPoints,
} from './pull';
import type { BannerDef, BannerRules, PullResult } from './types';

const RULES: BannerRules = {
  five: { base: 0.02, softStart: 45, softStep: 0.065, hard: 60 },
  four: { base: 0.12, every: 10 },
  featuredShare: 0.6,
  guaranteeAfterMiss: true,
  spark: { at: 120 },
};

const BANNER: BannerDef = {
  id: 'rateup-1',
  name: 'Test Rate-up',
  tagline: '',
  pityGroup: 'featured',
  rules: RULES,
  pool: { five: ['S5a', 'S5b'], four: ['S4a', 'S4b', 'S4c'], three: ['C3a', 'C3b', 'C3c', 'C3d'] },
  featured: { five: ['F5'], four: ['F4a', 'F4b'] },
  featuredFourShare: 0.5,
  cost: { single: 100, ten: 1000 },
};

const { spark: _spark, ...RULES_NO_SPARK } = RULES;

const STANDARD: BannerDef = {
  ...BANNER,
  id: 'standard',
  pityGroup: 'standard',
  featured: { five: [], four: [] },
  rules: RULES_NO_SPARK,
};

function run(banner: BannerDef, n: number, seed: string, history = false): PullResult[] {
  const state = newKindlingState();
  const rng = seedRng(seed);
  return pullManyInPlace(banner, state, rng, n, { history });
}

describe('pity curve', () => {
  test('rises through soft pity and is certain at the hard pity pull', () => {
    expect(fiveRate(RULES.five, 1)).toBe(0.02);
    expect(fiveRate(RULES.five, 44)).toBe(0.02);
    expect(fiveRate(RULES.five, 45)).toBeCloseTo(0.085, 10);
    expect(fiveRate(RULES.five, 46)).toBeCloseTo(0.15, 10);
    expect(fiveRate(RULES.five, 59)).toBeGreaterThan(0.99);
    expect(fiveRate(RULES.five, 60)).toBe(1);
    expect(fiveRate(RULES.five, 61)).toBe(1);
  });

  test('pity can be switched off', () => {
    expect(fiveRate({ base: 0.03, softStart: 0, softStep: 0, hard: 0 }, 500)).toBe(0.03);
  });

  test('next-pull chances match the curve', () => {
    expect(nextPullFiveChance(RULES, 0)).toBe(0.02);
    expect(nextPullFiveChance(RULES, 44)).toBeCloseTo(0.085, 10);
    expect(nextPullFiveChance(RULES, 59)).toBe(1);
    expect(nextPullFourChance(RULES, 0, 0)).toBe(0.12);
    expect(nextPullFourChance(RULES, 0, 9)).toBeCloseTo(0.98, 10);
    expect(nextPullFourChance(RULES, 59, 3)).toBe(0);
  });
});

describe('guarantees', () => {
  const results = run(BANNER, 300_000, 'guarantees');

  test('a 5-star always arrives within the hard pity count', () => {
    let gap = 0;
    let longest = 0;
    for (const r of results) {
      gap++;
      if (r.rarity === 5) {
        longest = Math.max(longest, gap);
        gap = 0;
      }
    }
    expect(longest).toBeLessThanOrEqual(60);
    expect(longest).toBeGreaterThan(50); // pity is actually being reached, not just never needed
  });

  test('a 4-star or better arrives at least every ten pulls', () => {
    let gap = 0;
    let longest = 0;
    for (const r of results) {
      gap++;
      if (r.rarity >= 4) {
        longest = Math.max(longest, gap);
        gap = 0;
      }
    }
    expect(longest).toBeLessThanOrEqual(10);
    expect(results.some((r) => r.pity === 'four')).toBe(true);
  });

  test('a 5-star that misses the featured unit is followed by a featured one', () => {
    const fives = results.filter((r) => r.rarity === 5);
    let misses = 0;
    for (let i = 0; i < fives.length - 1; i++) {
      if (!fives[i]!.featured) {
        misses++;
        expect(fives[i + 1]!.featured).toBe(true);
        expect(fives[i + 1]!.viaGuarantee).toBe(true);
      }
    }
    expect(misses).toBeGreaterThan(100);
  });

  test('two misses in a row never happen, so the featured share is 1 / (2 - share)', () => {
    const fives = results.filter((r) => r.rarity === 5);
    const share = fives.filter((r) => r.featured).length / fives.length;
    expect(share).toBeGreaterThan(1 / 1.4 - 0.01);
    expect(share).toBeLessThan(1 / 1.4 + 0.01);
  });

  test('featured 4-stars appear about half the time among 4-stars', () => {
    const fours = results.filter((r) => r.rarity === 4);
    const share = fours.filter((r) => r.featured).length / fours.length;
    expect(share).toBeGreaterThan(0.48);
    expect(share).toBeLessThan(0.52);
  });

  test('pity labels only appear where they belong', () => {
    for (const r of results) {
      if (r.pity === 'hard') expect(r.sinceFive).toBeGreaterThanOrEqual(60);
      if (r.pity === 'soft') {
        expect(r.sinceFive).toBeGreaterThanOrEqual(45);
        expect(r.sinceFive).toBeLessThan(60);
      }
      if (r.sinceFive < 45 && r.rarity === 5) expect(r.pity).toBe('none');
    }
  });

  test('a standard banner has no featured items and no guarantee', () => {
    const std = run(STANDARD, 100_000, 'standard');
    expect(std.some((r) => r.featured)).toBe(false);
    expect(std.filter((r) => r.rarity === 5).every((r) => r.item === 'S5a' || r.item === 'S5b')).toBe(true);
  });
});

describe('the pull code matches the exact odds', () => {
  const analysis = analyzeRules(RULES);

  test('average pulls per 5-star', () => {
    const results = run(BANNER, 1_000_000, 'avg');
    const fives = results.filter((r) => r.rarity === 5).length;
    const avg = results.length / fives;
    expect(Math.abs(avg - analysis.avgPullsPerFive) / analysis.avgPullsPerFive).toBeLessThan(0.01);
  });

  test('pulls to the first featured unit, with the spark as a backstop', () => {
    const rng = seedRng('trials');
    const trials = 20_000;
    const counts: number[] = [];
    for (let i = 0; i < trials; i++) {
      const state = newKindlingState();
      let n = 0;
      for (;;) {
        n++;
        const r = pullInPlace(BANNER, state, rng, { history: false });
        if (r.rarity === 5 && r.featured) break;
        if (n === 120) break; // spark
      }
      counts.push(n);
    }
    counts.sort((a, b) => a - b);
    const mean = counts.reduce((a, b) => a + b, 0) / trials;
    const at = (q: number): number => counts[Math.min(trials - 1, Math.floor(q * trials))]!;
    expect(Math.abs(mean - analysis.avgPullsToFeatured) / analysis.avgPullsToFeatured).toBeLessThan(0.015);
    expect(Math.abs(at(0.5) - analysis.medianToFeatured!)).toBeLessThanOrEqual(2);
    expect(Math.abs(at(0.9) - analysis.p90ToFeatured!)).toBeLessThanOrEqual(3);
    expect(counts.at(-1)).toBeLessThanOrEqual(120);
  });

  test('the analysis is internally consistent', () => {
    for (let t = 1; t < analysis.featuredCdf.length; t++) {
      expect(analysis.featuredCdf[t]!).toBeGreaterThanOrEqual(analysis.featuredCdf[t - 1]!);
      expect(analysis.anyCdf[t]!).toBeGreaterThanOrEqual(analysis.featuredCdf[t]! - 1e-12);
    }
    expect(analysis.featuredCdf.at(-1)).toBeCloseTo(1, 9);
    expect(analysis.worstCaseToFeatured).toBe(120);
    expect(analysis.avgPullsPerFive).toBeGreaterThan(29);
    expect(analysis.avgPullsPerFive).toBeLessThan(33);
    expect(analysis.featuredShareOverall).toBeCloseTo(1 / 1.4, 10);
    expect(analysis.medianToFeatured!).toBeLessThan(analysis.p90ToFeatured!);
  });

  test('without a featured unit every 5-star counts', () => {
    const a = analyzeRules(RULES_NO_SPARK, false);
    expect(a.featuredCdf.length).toBe(a.anyCdf.length);
    expect(a.featuredCdf.at(-1)).toBeCloseTo(1, 6);
    expect(a.featuredShareOverall).toBe(1);
    expect(a.worstCaseToFeatured).toBe(60);
  });
});

describe('state, replay and banners', () => {
  test('the same seed replays the same pulls', () => {
    const a = run(BANNER, 500, 'replay', true);
    const b = run(BANNER, 500, 'replay', true);
    expect(a).toEqual(b);
  });

  test('a saved state and rng resume exactly where they left off', () => {
    const state = newKindlingState();
    const rng = seedRng('resume');
    pullManyInPlace(BANNER, state, rng, 37);
    const savedState = JSON.parse(JSON.stringify(state)) as typeof state;
    const savedRng = JSON.parse(JSON.stringify(rng)) as typeof rng;
    const a = pullManyInPlace(BANNER, state, rng, 100);
    const b = pullManyInPlace(BANNER, savedState, savedRng, 100);
    expect(a).toEqual(b);
    expect(state).toEqual(savedState);
  });

  test('the pure wrapper leaves its input alone', () => {
    const state = newKindlingState();
    const { state: next, results } = pull(BANNER, state, seedRng('pure'), 10);
    expect(state.totalPulls).toBe(0);
    expect(next.totalPulls).toBe(10);
    expect(results).toHaveLength(10);
    expect(next.history).toHaveLength(10);
  });

  test('banners in one pity group share counters; other groups do not', () => {
    const sibling: BannerDef = { ...BANNER, id: 'rateup-2' };
    const state = newKindlingState();
    const rng = seedRng('groups');
    // Find a fresh state where the next pull is deep into pity, by pulling on banner 1 without a 5-star.
    for (let i = 0; i < 200 && (state.pity['featured']?.five ?? 0) < 20; i++) pullInPlace(BANNER, state, rng);
    const carried = state.pity['featured']!.five;
    expect(carried).toBeGreaterThanOrEqual(20);
    const r = pullInPlace(sibling, state, rng);
    expect(r.sinceFive).toBe(carried + 1);
    expect(state.pity['standard']).toBeUndefined();
    pullInPlace(STANDARD, state, rng);
    expect(state.pity['standard']!.five + state.pity['standard']!.four).toBeGreaterThan(0);
    expect(state.spark['rateup-1']).not.toBe(state.spark['rateup-2']);
  });

  test('history keeps the most recent pulls and is optional', () => {
    const state = newKindlingState();
    const rng = seedRng('history');
    pullManyInPlace(BANNER, state, rng, 400);
    expect(state.history).toHaveLength(300);
    expect(state.history.at(-1)!.n).toBe(400);
    pullManyInPlace(BANNER, state, rng, 5, { history: false });
    expect(state.history.at(-1)!.n).toBe(400);
    expect(state.totalPulls).toBe(405);
  });

  test('an empty pool fails loudly instead of returning nonsense', () => {
    const broken: BannerDef = { ...BANNER, pool: { ...BANNER.pool, three: [] } };
    const state = newKindlingState();
    const rng = seedRng('broken');
    expect(() => pullManyInPlace(broken, state, rng, 200)).toThrow(/no 3-stars/);
  });
});

describe('spark', () => {
  test('is available at the threshold and spends that many points', () => {
    const state = newKindlingState();
    const rng = seedRng('spark');
    pullManyInPlace(BANNER, state, rng, 119, { history: false });
    expect(canRedeemSpark(BANNER, state)).toBe(false);
    expect(() => redeemSparkInPlace(BANNER, state, 'F5')).toThrow(/Not enough/);
    pullInPlace(BANNER, state, rng, { history: false });
    expect(canRedeemSpark(BANNER, state)).toBe(true);
    redeemSparkInPlace(BANNER, state, 'F5');
    expect(sparkPoints(state, BANNER.id)).toBe(0);
  });

  test('only featured 5-stars can be chosen, and the standard banner has no spark', () => {
    const state = newKindlingState();
    state.spark[BANNER.id] = 500;
    expect(() => redeemSparkInPlace(BANNER, state, 'S5a')).toThrow(/not a featured/);
    expect(() => redeemSparkInPlace(STANDARD, state, 'S5a')).toThrow(/no spark/);
    expect(canRedeemSpark(STANDARD, state)).toBe(false);
  });

  test('leftover points become Gloam when the banner ends', () => {
    const state = newKindlingState();
    state.spark[BANNER.id] = 87;
    expect(expireBannerInPlace(BANNER.id, state)).toBe(87 * SPARK_REFUND_PER_POINT);
    expect(sparkPoints(state, BANNER.id)).toBe(0);
    expect(expireBannerInPlace(BANNER.id, state)).toBe(0);
  });
});

describe('collection', () => {
  const catalog: ItemCatalog = (id) => {
    if (id.startsWith('H5')) return { kind: 'hero', rarity: 5 };
    if (id.startsWith('H4')) return { kind: 'hero', rarity: 4 };
    if (id.startsWith('K5')) return { kind: 'card', rarity: 5 };
    if (id.startsWith('K3')) return { kind: 'card', rarity: 3 };
    return undefined;
  };

  test('duplicate heroes raise Resonance, then pay Gloam', () => {
    const col = newCollection();
    expect(applyPullInPlace(col, 'H5a', catalog)).toMatchObject({ isNew: true, resonance: 1, gloam: 0 });
    for (let rank = 2; rank <= 5; rank++) {
      expect(applyPullInPlace(col, 'H5a', catalog)).toMatchObject({ isNew: false, resonance: rank, gloam: 0 });
    }
    expect(applyPullInPlace(col, 'H5a', catalog)).toMatchObject({ resonance: 5, gloam: DUPE_GLOAM.hero[5] });
    expect(col.heroes['H5a']!.resonance).toBe(5);
    applyPullInPlace(col, 'H4a', catalog);
    applyPullInPlace(col, 'H4a', catalog);
    expect(col.heroes['H4a']!.resonance).toBe(2);
  });

  test('duplicate cards stack up to five copies, then pay Gloam', () => {
    const col = newCollection();
    expect(applyPullInPlace(col, 'K3a', catalog)).toMatchObject({ isNew: true, copies: 1, gloam: 0 });
    for (let copies = 2; copies <= 5; copies++) {
      expect(applyPullInPlace(col, 'K3a', catalog)).toMatchObject({ copies, gloam: 0 });
    }
    expect(applyPullInPlace(col, 'K3a', catalog)).toMatchObject({ copies: 5, gloam: DUPE_GLOAM.card[3] });
    expect(applyPullInPlace(col, 'K5x', catalog)).toMatchObject({ isNew: true, kind: 'card', rarity: 5 });
  });

  test('unknown items are rejected', () => {
    expect(() => applyPullInPlace(newCollection(), 'nope', catalog)).toThrow(/Unknown item/);
  });
});
