import type { Stats } from '../types';

export const MAX_RANK = 30;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Stats at a Lamplighter Rank (heroes) or encounter level (foes). Speed never scales. */
export function statsAtLevel(base: Stats, level: number): Stats {
  const g = Math.max(0, Math.min(MAX_RANK, level) - 1);
  return {
    hp: Math.round(base.hp * (1 + 0.13 * g)),
    atk: Math.round(base.atk * (1 + 0.1 * g)),
    def: Math.round(base.def * (1 + 0.08 * g)),
    spd: base.spd,
  };
}

/** Each Resonance rank above 1 adds 4% to HP, attack and defense. */
export function resonanceMultiplier(rank: number): number {
  return 1 + 0.04 * (clamp(Math.round(rank), 1, 5) - 1);
}

export function applyResonance(stats: Stats, rank: number): Stats {
  const m = resonanceMultiplier(rank);
  return { hp: Math.round(stats.hp * m), atk: Math.round(stats.atk * m), def: Math.round(stats.def * m), spd: stats.spd };
}
