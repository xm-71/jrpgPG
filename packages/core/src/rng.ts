/**
 * Seeded, serialisable random numbers (sfc32).
 *
 * The state is a plain 4-number array so it survives structuredClone and JSON.
 * Every random decision in the rules goes through here, which is what makes a battle,
 * a Descent seed or a pull sequence replayable from its seed and inputs alone.
 */

export type RngState = [number, number, number, number];

/** xmur3 string hash, used to turn seeds and labels into numbers. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Stable 32-bit hash of a string. */
export function hashString(str: string): number {
  return xmur3(str)();
}

/** Derive a new seed from labelled parts, e.g. deriveSeed('descent', '2026-09-29', 'floor', 2). */
export function deriveSeed(...parts: Array<string | number>): number {
  return hashString(parts.join('␟'));
}

export function seedRng(seed: string | number): RngState {
  const next = xmur3(String(seed));
  const state: RngState = [next(), next(), next(), next()];
  for (let i = 0; i < 12; i++) rngNext(state);
  return state;
}

/** Next float in [0, 1). Mutates the state in place. */
export function rngNext(s: RngState): number {
  let a = s[0];
  let b = s[1];
  let c = s[2];
  let d = s[3];
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  s[0] = a;
  s[1] = b;
  s[2] = c;
  s[3] = d;
  return (t >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function rngInt(s: RngState, n: number): number {
  return Math.floor(rngNext(s) * n);
}

/** True with probability p. */
export function rngChance(s: RngState, p: number): boolean {
  return rngNext(s) < p;
}

export function rngPick<T>(s: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('rngPick: empty list');
  return items[rngInt(s, items.length)] as T;
}

export interface Weighted<T> {
  weight: number;
  value: T;
}

export function rngWeighted<T>(s: RngState, items: readonly Weighted<T>[]): T {
  let total = 0;
  for (const it of items) total += Math.max(0, it.weight);
  if (total <= 0) throw new Error('rngWeighted: no positive weights');
  let roll = rngNext(s) * total;
  for (const it of items) {
    roll -= Math.max(0, it.weight);
    if (roll < 0) return it.value;
  }
  return items[items.length - 1]!.value;
}

/** In-place Fisher-Yates shuffle. Returns the same array. */
export function rngShuffle<T>(s: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rngInt(s, i + 1);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}

/** Small convenience wrapper for code that does not need to store the raw state. */
export class Rng {
  readonly state: RngState;

  constructor(seed: string | number | RngState) {
    this.state = Array.isArray(seed) ? seed : seedRng(seed);
  }

  next(): number {
    return rngNext(this.state);
  }
  int(n: number): number {
    return rngInt(this.state, n);
  }
  chance(p: number): boolean {
    return rngChance(this.state, p);
  }
  pick<T>(items: readonly T[]): T {
    return rngPick(this.state, items);
  }
  weighted<T>(items: readonly Weighted<T>[]): T {
    return rngWeighted(this.state, items);
  }
  shuffle<T>(items: T[]): T[] {
    return rngShuffle(this.state, items);
  }
}
