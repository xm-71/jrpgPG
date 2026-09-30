/** The numbers that define how card combat feels. Content tunes cards and foes; these stay put. */

export const MAX_LIGHT = 4;
export const HAND_LIMIT = 3;
export const MAX_FOES = 4;

/** A weakness hit deals this much more and chips Shell. */
export const WEAK_MULT = 1.25;
export const RESIST_MULT = 0.5;
/** A Broken foe takes this much more until it recovers. */
export const BROKEN_MULT = 1.5;
/** Hexed units take more; chilled units deal less. */
export const HEX_MULT = 1.25;
export const CHILL_MULT = 0.75;

/** Each Chain step adds this much damage, up to the cap. */
export const CHAIN_STEP = 0.2;
export const CHAIN_MAX_STEPS = 3;

export const GAUGE_MAX = 100;
export const GAUGE_PER_CARD = 10;
export const GAUGE_PER_BREAK = 20;
/** Breaking a foe also draws this many cards. */
export const BREAK_DRAW = 1;

/** From this turn on, the hour grows late: foes gain Rage every time they act. */
export const LATE_TURN = 12;

export const ASH_ID = 'ash';
