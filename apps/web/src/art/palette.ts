import type { Affinity } from '@duskline/core';

/** Colours for generated art. The CSS tokens in theme.css use the same values. */
export const INK = '#07060B';
export const BONE = '#ECE6D8';
export const BLOOD = '#C8322C';
export const EMBER = '#E25A45';
export const GOLD = '#D9A441';
export const MOON = '#A9B6CC';
export const VIOLET = '#4E2F66';

export const AFFINITY_COLOR: Record<Affinity, string> = {
  sun: '#E8B04A',
  moon: '#A3AEFF',
  flame: '#EC6A3C',
  frost: '#80D2EF',
  gale: '#6FD6A6',
  volt: '#E6DF55',
};

/** A small seeded generator for art, so the same id always draws the same picture. */
export function artRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;
