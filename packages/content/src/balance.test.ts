import { describe, expect, test } from 'vitest';
import { autoClimb, startClimb } from '@duskline/core';
import { HEROES, STRATA, climbDeps } from './index';

/**
 * Difficulty regression. The plain auto-climber (see core/climb/auto.ts) plays whole climbs with
 * a fresh Rank 1 profile. It is a cautious, ordinary player, so these bands sit below what a
 * thoughtful person manages. Retune them with `pnpm sim climb` when content changes on purpose.
 */

const RUNS = 10;

function clearRate(stratum: number, heroes: readonly string[]): number {
  let clears = 0;
  let total = 0;
  for (const hero of heroes) {
    for (let i = 0; i < RUNS; i++) {
      const run = autoClimb(startClimb({ seed: `bal-${stratum}-${hero}-${i}`, daily: null, stratum, hero, resonance: 1, rank: 1, kindled: {}, archive: [] }, climbDeps), climbDeps);
      total++;
      if (run.result === 'cleared') clears++;
    }
  }
  return clears / total;
}

describe('difficulty', () => {
  const all = HEROES.map((h) => h.id);
  const bands: Array<[number, number]> = [
    [0.6, 0.92],
    [0.28, 0.6],
    [0.14, 0.45],
  ];

  for (const s of STRATA) {
    test(`${s.name} is cleared about as often as intended`, () => {
      const [lo, hi] = bands[s.index]!;
      const rate = clearRate(s.index, all);
      expect(rate).toBeGreaterThanOrEqual(lo);
      expect(rate).toBeLessThanOrEqual(hi);
    }, 60_000);
  }

  test('every hero can clear the Root, and the tutorial hero comfortably', () => {
    for (const h of all) expect(clearRate(0, [h]), h).toBeGreaterThanOrEqual(h === 'wren' ? 0.4 : 0.3);
  }, 60_000);

  test('the strata get harder as you climb', () => {
    const rates = STRATA.map((s) => clearRate(s.index, ['wren', 'marisol', 'io', 'tamsin']));
    expect(rates[0]!).toBeGreaterThan(rates[1]!);
    expect(rates[1]!).toBeGreaterThan(rates[2]! - 0.05);
  }, 60_000);
});
