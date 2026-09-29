import { describe, expect, test } from 'vitest';
import { kindle, kindleCost, newProfile, redeemSpark, seedRng, sparkPoints } from '@duskline/core';
import { STARTER_HEROES, catalog, rateUpBanner, STANDARD_BANNER } from './index';

const now = Date.parse('2026-09-29T10:00:00Z');
const mk = () => newProfile(now, STARTER_HEROES);

describe('kindle', () => {
  test('a ten-pull costs the discounted price and yields ten results', () => {
    const p = mk();
    p.gloam = 5000;
    const banner = rateUpBanner(0);
    const out = kindle(p, banner, 10, seedRng('t1'), catalog, now)!;
    expect(out).toHaveLength(10);
    expect(p.gloam).toBe(5000 - kindleCost(banner, 10));
    expect(kindleCost(banner, 10)).toBe(1000);
    expect(kindleCost(banner, 3)).toBe(300);
    expect(p.kindling.totalPulls).toBe(10);
    expect(sparkPoints(p.kindling, banner.id)).toBe(10);
  });

  test('is refused, changing nothing, when Gloam is short', () => {
    const p = mk();
    p.gloam = 99;
    const before = structuredClone(p);
    expect(kindle(p, STANDARD_BANNER, 1, seedRng('t2'), catalog, now)).toBeNull();
    expect(p).toEqual(before);
  });

  test('the same seed and state give the same pulls', () => {
    const a = mk();
    const b = mk();
    a.gloam = b.gloam = 3000;
    const ra = kindle(a, rateUpBanner(1), 10, seedRng('same'), catalog, now)!.map((o) => o.pull.item);
    const rb = kindle(b, rateUpBanner(1), 10, seedRng('same'), catalog, now)!.map((o) => o.pull.item);
    expect(ra).toEqual(rb);
  });

  test('spark redeems a featured 5-star after 120 pulls and only then', () => {
    const p = mk();
    const banner = rateUpBanner(0);
    expect(redeemSpark(p, banner, 'ysolde', catalog, now)).toBeNull();
    p.kindling.spark[banner.id] = 120;
    expect(redeemSpark(p, banner, 'brannoch', catalog, now)).toBeNull();
    const got = redeemSpark(p, banner, 'ysolde', catalog, now)!;
    expect(got.isNew).toBe(true);
    expect(p.collection.heroes['ysolde']).toEqual({ resonance: 1 });
    expect(sparkPoints(p.kindling, banner.id)).toBe(0);
    expect(p.party).toContain('ysolde');
  });
});
