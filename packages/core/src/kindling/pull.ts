import { rngInt, rngNext, type RngState } from '../rng';
import type {
  BannerDef,
  FiveStarRules,
  KindlingState,
  PityCounters,
  PityKind,
  PullRarity,
  PullResult,
} from './types';

export const MAX_HISTORY = 300;

/** Gloam refunded for each unused spark point when a banner ends. */
export const SPARK_REFUND_PER_POINT = 50;

export function newKindlingState(): KindlingState {
  return { pity: {}, spark: {}, history: [], totalPulls: 0 };
}

function countersFor(state: KindlingState, group: string): PityCounters {
  let c = state.pity[group];
  if (!c) {
    c = { five: 0, four: 0, guaranteed: false };
    state.pity[group] = c;
  }
  return c;
}

/**
 * Chance of a 5-star on the n-th pull since the last one (1-based, counting the pull itself).
 * This is the whole pity curve.
 */
export function fiveRate(rules: FiveStarRules, n: number): number {
  if (rules.hard > 0 && n >= rules.hard) return 1;
  if (rules.softStart > 0 && n >= rules.softStart) {
    return Math.min(1, rules.base + (n - rules.softStart + 1) * rules.softStep);
  }
  return rules.base;
}

function pickFrom(rng: RngState, items: readonly string[], what: string): string {
  if (items.length === 0) throw new Error(`Banner has no ${what} to give`);
  return items[rngInt(rng, items.length)] as string;
}

export interface PullOptions {
  /** Timestamp for the history record. */
  at?: number;
  /** Skip the history record, for large simulations. */
  history?: boolean;
}

/**
 * One pull. Mutates `state` and `rng`.
 *
 * Randomness is consumed in a fixed order (rarity roll, then the featured roll when one is
 * needed, then the item pick), so a saved state and seed replay exactly.
 */
export function pullInPlace(banner: BannerDef, state: KindlingState, rng: RngState, opts: PullOptions = {}): PullResult {
  const rules = banner.rules;
  const c = countersFor(state, banner.pityGroup);
  const n5 = c.five + 1;
  const n4 = c.four + 1;
  const p5 = fiveRate(rules.five, n5);
  const roll = rngNext(rng);

  let rarity: PullRarity = 3;
  let pity: PityKind = 'none';
  let featured = false;
  let viaGuarantee = false;
  let item: string;

  if (roll < p5) {
    rarity = 5;
    if (rules.five.hard > 0 && n5 >= rules.five.hard) pity = 'hard';
    else if (rules.five.softStart > 0 && n5 >= rules.five.softStart) pity = 'soft';
  } else if (n4 >= rules.four.every || roll < p5 + rules.four.base) {
    rarity = 4;
    if (!(roll < p5 + rules.four.base)) pity = 'four';
  }

  if (rarity === 5) {
    const feats = banner.featured.five;
    if (feats.length > 0) {
      if (c.guaranteed) {
        featured = true;
        viaGuarantee = true;
      } else {
        featured = rngNext(rng) < rules.featuredShare;
      }
      if (featured) {
        item = pickFrom(rng, feats, 'featured 5-stars');
        c.guaranteed = false;
      } else {
        item = pickFrom(rng, banner.pool.five.length > 0 ? banner.pool.five : feats, '5-stars');
        c.guaranteed = rules.guaranteeAfterMiss;
      }
    } else {
      item = pickFrom(rng, banner.pool.five, '5-stars');
    }
    c.five = 0;
    c.four = 0;
  } else if (rarity === 4) {
    const feats = banner.featured.four;
    if (feats.length > 0 && rngNext(rng) < banner.featuredFourShare) {
      featured = true;
      item = pickFrom(rng, feats, 'featured 4-stars');
    } else {
      item = pickFrom(rng, banner.pool.four.length > 0 ? banner.pool.four : feats, '4-stars');
    }
    c.five++;
    c.four = 0;
  } else {
    item = pickFrom(rng, banner.pool.three, '3-stars');
    c.five++;
    c.four++;
  }

  state.totalPulls++;
  state.spark[banner.id] = (state.spark[banner.id] ?? 0) + 1;
  const result: PullResult = {
    n: state.totalPulls,
    banner: banner.id,
    item,
    rarity,
    featured,
    pity,
    viaGuarantee,
    sinceFive: n5,
  };
  if (opts.history !== false) {
    state.history.push({ n: result.n, banner: banner.id, item, rarity, featured, at: opts.at ?? 0 });
    if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
  }
  return result;
}

/** Several pulls in a row. Mutates `state` and `rng`. */
export function pullManyInPlace(
  banner: BannerDef,
  state: KindlingState,
  rng: RngState,
  count: number,
  opts: PullOptions = {},
): PullResult[] {
  const out: PullResult[] = [];
  for (let i = 0; i < count; i++) out.push(pullInPlace(banner, state, rng, opts));
  return out;
}

/** Pure version: returns the new state and leaves the input untouched. The rng is still advanced. */
export function pull(
  banner: BannerDef,
  state: KindlingState,
  rng: RngState,
  count = 1,
  opts: PullOptions = {},
): { state: KindlingState; results: PullResult[] } {
  const next = structuredClone(state);
  return { state: next, results: pullManyInPlace(banner, next, rng, count, opts) };
}

// ---------------------------------------------------------------------------
// Spark
// ---------------------------------------------------------------------------

export function sparkPoints(state: KindlingState, bannerId: string): number {
  return state.spark[bannerId] ?? 0;
}

export function canRedeemSpark(banner: BannerDef, state: KindlingState): boolean {
  const at = banner.rules.spark?.at;
  return at !== undefined && banner.featured.five.length > 0 && sparkPoints(state, banner.id) >= at;
}

/** Trade spark points for a featured 5-star of the player's choice. Mutates `state`. */
export function redeemSparkInPlace(banner: BannerDef, state: KindlingState, itemId: string): void {
  const at = banner.rules.spark?.at;
  if (at === undefined) throw new Error(`${banner.id} has no spark exchange`);
  if (!banner.featured.five.includes(itemId)) throw new Error(`${itemId} is not a featured 5-star on ${banner.id}`);
  if (sparkPoints(state, banner.id) < at) throw new Error(`Not enough spark points on ${banner.id}`);
  state.spark[banner.id] = sparkPoints(state, banner.id) - at;
}

/** When a banner ends, leftover spark points turn into Gloam. Mutates `state` and returns the Gloam. */
export function expireBannerInPlace(bannerId: string, state: KindlingState): number {
  const left = sparkPoints(state, bannerId);
  delete state.spark[bannerId];
  return left * SPARK_REFUND_PER_POINT;
}
