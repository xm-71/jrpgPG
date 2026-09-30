import { signal } from '@preact/signals';
import { climbStart, dayKey, dueBeats, startClimb, type ClimbRun, type Profile } from '@duskline/core';
import { BEATS, climbDeps } from '@duskline/content';
import { now, randomSeed } from './clock';
import { go } from './nav';
import { mutate } from './store';

/** Moves between the big parts of the game: starting a climb, and the story scenes between climbs. */

/** A settled climb, kept so its results stay on screen after the profile lets go of it. */
export const finished = signal<ClimbRun | null>(null);

/** Every new Lamplighter's first climb uses this seed: one fair, hand-checked map for the tutorial. */
export const FIRST_CLIMB_SEED = 'hush';

export function beginClimb(o: { stratum: number; daily: boolean; hero?: string; seed?: string }): void {
  mutate((p) => {
    const day = dayKey(now());
    const seed = o.daily ? `daily-${day}-${o.stratum}` : (o.seed ?? randomSeed());
    p.climb.run = startClimb(climbStart(p, { seed, daily: o.daily ? day : null, stratum: o.stratum, ...(o.hero ? { hero: o.hero } : {}) }), climbDeps);
  });
  go({ name: 'climb' }, { replace: true });
}

export const hasScenes = (p: Profile): boolean => dueBeats(p, BEATS).length > 0;

/** After a climb or on arrival: play any story scenes that are due, otherwise go home. */
export function afterward(p: Profile): void {
  go({ name: hasScenes(p) ? 'scene' : 'home' }, { replace: true });
}

/** A player still in their first climb gets the tips. */
export const isTutorial = (p: Profile): boolean => p.climb.runs === 0;
