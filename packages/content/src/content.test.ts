import { describe, expect, test } from 'vitest';
import { ASH_ID, cardText } from '@duskline/core';
import {
  AFTERLIGHTS,
  BANNER_EPOCH,
  BEATS,
  CARDS,
  CYCLE_MS,
  ENCOUNTERS,
  EVENTS,
  FIRST_KINDLING_HERO,
  FOES,
  HEROES,
  KINDLED,
  KINDLING_ITEMS,
  POOL,
  STANDARD_BANNER,
  STARTER_HEROES,
  STRATA,
  activeBanners,
  bannerById,
  catalog,
  cycleAt,
  heroById,
  rateUpBanner,
  requireEncounter,
  requireFoe,
} from './index';
import { validateContent } from './schema';

describe('content', () => {
  test('passes the schema and every cross-reference check', () => {
    expect(validateContent()).toEqual([]);
  });

  test('has the launch roster: six story heroes and six Afterlights', () => {
    expect(HEROES.filter((h) => h.origin === 'story')).toHaveLength(6);
    expect(AFTERLIGHTS).toHaveLength(6);
    expect(AFTERLIGHTS.filter((h) => h.rarity === 5)).toHaveLength(3);
    expect(STARTER_HEROES.every((id) => heroById(id))).toBe(true);
  });

  test('every story hero joins through the story or the first Kindling', () => {
    const unlocked = new Set<string>([FIRST_KINDLING_HERO, ...STARTER_HEROES, ...BEATS.flatMap((b) => b.unlocks ?? [])]);
    for (const h of HEROES.filter((x) => x.origin === 'story')) expect(unlocked.has(h.id), h.id).toBe(true);
    for (const h of AFTERLIGHTS) expect(unlocked.has(h.id), h.id).toBe(false);
  });

  test('story Gloam adds up to a sensible supply of pulls', () => {
    const total = BEATS.reduce((sum, b) => sum + (b.gloam ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(700);
    expect(total).toBeLessThanOrEqual(2000);
  });

  test('the item catalog knows everything Kindling can give', () => {
    for (const id of [...KINDLING_ITEMS.five, ...KINDLING_ITEMS.four, ...KINDLING_ITEMS.three]) expect(catalog(id), id).toBeDefined();
    expect(catalog('nope')).toBeUndefined();
    expect(catalog('cut')).toBeUndefined();
    expect(catalog('ysolde')).toEqual({ kind: 'hero', rarity: 5 });
    expect(catalog('card.worn-lantern')).toEqual({ kind: 'card', rarity: 3 });
    expect(KINDLED).toHaveLength(KINDLING_ITEMS.five.length - 3 + KINDLING_ITEMS.four.length - 3 + KINDLING_ITEMS.three.length);
  });

  test('the common pool covers every affinity, so any deck can learn to Break anything', () => {
    for (const a of ['sun', 'moon', 'flame', 'frost', 'gale', 'volt'] as const) {
      const cards = POOL.filter((c) => c.affinity === a);
      expect(cards.length, a).toBeGreaterThanOrEqual(4);
      expect(new Set(cards.map((c) => c.tier)).size, a).toBeGreaterThanOrEqual(3);
    }
    const wanted = new Set(FOES.flatMap((f) => f.weaknesses));
    expect(wanted.size).toBe(6);
  });

  test('every card reads as plain rules text', () => {
    for (const c of CARDS) if (c.id !== ASH_ID) expect(cardText(c).length, c.id).toBeGreaterThan(3);
  });

  test('every foe turns up somewhere, and every encounter is used', () => {
    const used = new Set<string>([
      ...STRATA.flatMap((s) => [...s.floors.flatMap((f) => [...f.battles, f.guardian]), ...s.elites]),
      ...EVENTS.flatMap((e) => JSON.stringify(e).match(/"encounter":"([^"]+)"/g) ?? []).map((m) => m.split('"')[3]!),
    ]);
    for (const e of ENCOUNTERS) expect(used.has(e.id), e.id).toBe(true);
    const foes = new Set(ENCOUNTERS.flatMap((e) => [...e.foes.map((f) => f.foe), ...(e.summons ?? [])]));
    for (const f of FOES) expect(foes.has(f.id), f.id).toBe(true);
  });

  test('each floor offers Fades with a spread of weaknesses', () => {
    for (const s of STRATA) {
      for (const f of s.floors) {
        const weak = new Set(f.battles.flatMap((id) => requireEncounter(id).foes.flatMap((sp) => requireFoe(sp.foe).weaknesses)));
        expect(weak.size, `${s.id}`).toBeGreaterThanOrEqual(4);
      }
    }
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
