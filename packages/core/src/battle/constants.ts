/** Every tunable number of the battle rules lives here so balance passes touch one file. */

/** Timeline: a unit with speed 100 acts every 100 time units. */
export const INTERVAL = 10_000;

/** Shared party resource. Basic attacks build it, skills spend it. */
export const LANTERN_MAX = 5;
export const LANTERN_START = 3;

/** Ultimate gauge. */
export const GAUGE_MAX = 100;
export const GAUGE_ON_WEAK = 5;
export const GAUGE_ON_BREAK = 12;
export const GAUGE_ON_HIT_BASE = 4;
export const GAUGE_ON_HIT_SCALE = 16;
export const GUARD_GAUGE = 15;
export const BURST_GAUGE = 10;

/** Damage. */
export const WEAK_MULT = 1.25;
export const RESIST_MULT = 0.75;
export const BREAK_MULT = 1.5;
export const CRIT_CHANCE = 0.06;
export const CRIT_MULT = 1.5;
export const GUARD_MULT = 0.5;

/** A Broken enemy is pushed back by this fraction of its cycle, then skips its next turn. */
export const BREAK_DELAY = 0.25;

/** Guarding shortens the actor's next wait. */
export const GUARD_TIME_COST = 0.75;

/** Each baton pass in a chain adds this much damage, up to the cap. */
export const PASS_BONUS = 0.1;
export const PASS_BONUS_CAP = 0.3;

/** Horizon Burst: every party member hits every enemy with this power. */
export const BURST_POWER = 1.4;

/** Safety net so a broken content file can never hang a battle or a simulation. */
export const MAX_TURNS = 300;
