import { MAX_RANK } from './battle/scaling';

/** Lamplighter Rank: the account level that scales every hero's stats. */

/** Gloam awarded each time the player reaches a new Rank. */
export const RANK_UP_GLOAM = 50;

/** XP needed to go from `rank` to `rank + 1`. */
export function xpToNext(rank: number): number {
  return 40 + 20 * (Math.max(1, rank) - 1);
}

export interface RankState {
  rank: number;
  /** XP progress toward the next Rank. */
  xp: number;
}

export interface RankGain extends RankState {
  ranksGained: number;
}

export function applyXp(state: RankState, gain: number): RankGain {
  let { rank, xp } = state;
  xp += Math.max(0, Math.round(gain));
  let ranksGained = 0;
  while (rank < MAX_RANK && xp >= xpToNext(rank)) {
    xp -= xpToNext(rank);
    rank++;
    ranksGained++;
  }
  if (rank >= MAX_RANK) xp = 0;
  return { rank, xp, ranksGained };
}
