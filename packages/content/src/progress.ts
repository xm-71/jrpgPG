import { applyXp, type RankState } from '@duskline/core';
import { FIRST_KINDLING_HERO, STARTER_HEROES } from './constants';
import { STAGES } from './stages';

/**
 * What a player who clears every stage once, in order, would have at each point.
 * The simulations and the difficulty tests use this as their "on-curve" player.
 */

/** Hero ids owned on arriving at the stage with this index. */
export function ownedHeroIdsBefore(stageIndex: number): string[] {
  const ids = new Set<string>(STARTER_HEROES);
  if (stageIndex >= 1) ids.add(FIRST_KINDLING_HERO); // the scripted first Kindling comes after 0-1
  for (let i = 0; i < stageIndex; i++) for (const id of STAGES[i]!.unlocks ?? []) ids.add(id);
  return [...ids];
}

/** Lamplighter Rank on arriving at the stage with this index. */
export function rankBefore(stageIndex: number): number {
  let state: RankState = { rank: 1, xp: 0 };
  for (let i = 0; i < stageIndex; i++) state = applyXp(state, STAGES[i]!.xp);
  return state.rank;
}
