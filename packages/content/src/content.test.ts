import { describe, expect, test } from 'vitest';
import {
  AFTERLIGHTS,
  BANNER_EPOCH,
  CARDS,
  CYCLE_MS,
  ENEMIES,
  HEROES,
  KINDLING_ITEMS,
  STAGES,
  STANDARD_BANNER,
  STARTER_HEROES,
  activeBanners,
  bannerById,
  catalog,
  cycleAt,
  heroById,
  rateUpBanner,
  requireStage,
} from './index';
import { validateContent } from './schema';

describe('content', () => {
  test('passes the schema and every cross-reference check', () => {
    expect(validateContent()).toEqual([]);
  });

  test('has the launch roster from the roadmap: six story heroes and six Afterlights', () => {
    expect(HEROES.filter((h) => h.origin === 'story')).toHaveLength(6);
    expect(AFTERLIGHTS).toHaveLength(6);
    expect(AFTERLIGHTS.filter((h) => h.rarity === 5)).toHaveLength(3);
    expect(STARTER_HEROES.every((id) => heroById(id))).toBe(true);
  });

  test('every story hero is unlocked by the campaign, and Io by the first Kindling', () => {
    const unlocked = new Set(['io', ...STARTER_HEROES, ...STAGES.flatMap((s) => s.unlocks ?? [])]);
    for (const h of HEROES.filter((x) => x.origin === 'story')) expect(unlocked.has(h.id), h.id).toBe(true);
  });

  test('story levels never go down and first clears add up to a sensible starter supply', () => {
    let last = 0;
    for (const s of STAGES) {
      expect(s.level).toBeGreaterThanOrEqual(last);
      last = s.level;
    }
    const total = STAGES.reduce((sum, s) => sum + s.firstClearGloam, 0);
    expect(total).toBeGreaterThanOrEqual(700); // at least seven pulls from the story alone
    expect(total).toBeLessThanOrEqual(1500);
  });

  test('the item catalog knows everything Kindling can give', () => {
    for (const id of [...KINDLING_ITEMS.five, ...KINDLING_ITEMS.four, ...KINDLING_ITEMS.three]) expect(catalog(id), id).toBeDefined();
    expect(catalog('nope')).toBeUndefined();
    expect(catalog('ysolde')).toEqual({ kind: 'hero', rarity: 5 });
    expect(catalog('card.worn-lantern')).toEqual({ kind: 'card', rarity: 3 });
    expect(CARDS.length).toBe(KINDLING_ITEMS.five.length - 3 + KINDLING_ITEMS.four.length - 3 + KINDLING_ITEMS.three.length);
  });

  test('enemy weaknesses ask for a spread of affinities', () => {
    const wanted = new Set(ENEMIES.flatMap((e) => e.weaknesses));
    expect(wanted.size).toBe(6);
  });

  test('stages can be looked up and unknown ids fail loudly', () => {
    expect(requireStage('1-5').name).toBe('The Umbral Warden');
    expect(() => requireStage('9-9')).toThrow(/Unknown stage/);
  });
});

describe('banners', () => {
  test('the standard banner has no featured items or spark', () => {
    expect(STANDARD_BANNER.featured).toEqual({ five: [], four: [] });
    expect(STANDARD_BANNER.rules.spark).toBeUndefined();
    expect(STANDARD_BANNER.pool.five).toEqual([...KINDLING_ITEMS.five]);
  });

  test('rate-up banners rotate through the three 5-star Afterlights and repeat', () => {
    const feats = [0, 1, 2, 3, 4, 5].map((c) => rateUpBanner(c).featured.five[0]);
    expect(feats).toEqual(['ysolde', 'kestrel', 'sable', 'ysolde', 'kestrel', 'sable']);
    for (let c = 0; c < 6; c++) {
      const b = rateUpBanner(c);
      expect(b.id).toBe(`rateup-${c}`);
      expect(b.featured.five).toHaveLength(1);
      expect(b.featured.four).toHaveLength(2);
      expect(b.pool.five).not.toContain(b.featured.five[0]);
      expect(b.pool.five).toHaveLength(KINDLING_ITEMS.five.length - 1);
      expect(b.rules.spark?.at).toBe(120);
    }
  });

  test('cycles are six weeks long and start on the epoch', () => {
    expect(cycleAt(BANNER_EPOCH - 1)).toBe(0);
    expect(cycleAt(BANNER_EPOCH)).toBe(0);
    expect(cycleAt(BANNER_EPOCH + CYCLE_MS - 1)).toBe(0);
    expect(cycleAt(BANNER_EPOCH + CYCLE_MS)).toBe(1);
    const a = activeBanners(BANNER_EPOCH + 3 * CYCLE_MS + 5);
    expect(a.cycle).toBe(3);
    expect(a.endsAt - a.startsAt).toBe(CYCLE_MS);
    expect(a.rateUp.id).toBe('rateup-3');
    expect(activeBanners(0, 2).rateUp.id).toBe('rateup-2');
  });

  test('banners can be found again from their ids', () => {
    expect(bannerById('standard')).toBe(STANDARD_BANNER);
    expect(bannerById('rateup-7')?.id).toBe('rateup-7');
    expect(bannerById('rateup-x')).toBeUndefined();
    expect(bannerById('mystery')).toBeUndefined();
  });
});
