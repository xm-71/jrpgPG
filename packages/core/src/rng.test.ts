import { describe, expect, test } from 'vitest';
import { Rng, deriveSeed, hashString, rngInt, rngNext, rngShuffle, rngWeighted, seedRng } from './rng';

describe('seeded rng', () => {
  test('the same seed gives the same sequence', () => {
    const a = new Rng('duskline');
    const b = new Rng('duskline');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds diverge', () => {
    const a = Array.from({ length: 10 }, ((r) => () => r.next())(new Rng(1)));
    const b = Array.from({ length: 10 }, ((r) => () => r.next())(new Rng(2)));
    expect(a).not.toEqual(b);
  });

  test('state survives a JSON round trip mid-sequence', () => {
    const s = seedRng('save-me');
    for (let i = 0; i < 7; i++) rngNext(s);
    const restored = JSON.parse(JSON.stringify(s)) as typeof s;
    expect(Array.from({ length: 20 }, () => rngNext(s))).toEqual(Array.from({ length: 20 }, () => rngNext(restored)));
  });

  test('floats stay in [0, 1) and average near one half', () => {
    const s = seedRng(99);
    let sum = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      const v = rngNext(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / n).toBeGreaterThan(0.49);
    expect(sum / n).toBeLessThan(0.51);
  });

  test('integers cover the whole range evenly enough', () => {
    const s = seedRng('ints');
    const counts = new Array<number>(6).fill(0);
    for (let i = 0; i < 12_000; i++) counts[rngInt(s, 6)]!++;
    for (const c of counts) {
      expect(c).toBeGreaterThan(1800);
      expect(c).toBeLessThan(2200);
    }
  });

  test('weighted picks follow their weights', () => {
    const s = seedRng('weights');
    const tally = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 20_000; i++) {
      tally[
        rngWeighted(s, [
          { weight: 1, value: 'a' as const },
          { weight: 3, value: 'b' as const },
          { weight: 0, value: 'c' as const },
        ])
      ]++;
    }
    expect(tally.c).toBe(0);
    expect(tally.b / tally.a).toBeGreaterThan(2.7);
    expect(tally.b / tally.a).toBeLessThan(3.3);
  });

  test('shuffle keeps every element', () => {
    const s = seedRng('shuffle');
    const items = Array.from({ length: 30 }, (_, i) => i);
    const shuffled = rngShuffle(s, [...items]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });

  test('derived seeds are stable and depend on every part', () => {
    expect(deriveSeed('descent', '2026-09-29')).toBe(deriveSeed('descent', '2026-09-29'));
    expect(deriveSeed('descent', '2026-09-29')).not.toBe(deriveSeed('descent', '2026-09-30'));
    expect(deriveSeed('a', 'bc')).not.toBe(deriveSeed('ab', 'c'));
    expect(hashString('x')).toBe(hashString('x'));
  });
});
