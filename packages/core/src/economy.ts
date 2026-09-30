/**
 * Gloam is the game's only currency and it is only ever earned by playing.
 * Every source is named here, and the ones that could be farmed have a cap.
 */

export type EarnSource =
  | 'starter'
  | 'story'
  | 'rank'
  | 'dupe'
  | 'spark'
  | 'task'
  | 'climbFloor'
  | 'climbDaily'
  | 'climbWeekly';

/** Caps per UTC day and per UTC ISO week. A missing cap means the source cannot be farmed. */
export const EARN_CAPS: Record<EarnSource, { daily?: number; weekly?: number }> = {
  starter: {},
  story: {},
  rank: {},
  dupe: {},
  spark: {},
  task: { daily: 75 },
  climbFloor: { weekly: 300 },
  climbDaily: { daily: 120 },
  climbWeekly: { weekly: 300 },
};

export interface Ledger {
  day: string;
  week: string;
  daily: Record<string, number>;
  weekly: Record<string, number>;
}

/** UTC calendar day as YYYY-MM-DD. Also the seed of the daily climb. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** UTC ISO week as YYYY-Www. */
export function weekKey(now: number): string {
  const d = new Date(now);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function newLedger(now: number): Ledger {
  return { day: dayKey(now), week: weekKey(now), daily: {}, weekly: {} };
}

/** Start a fresh day or week when the clock has moved on. Mutates the ledger. */
export function rollLedger(ledger: Ledger, now: number): void {
  const day = dayKey(now);
  const week = weekKey(now);
  if (ledger.day !== day) {
    ledger.day = day;
    ledger.daily = {};
  }
  if (ledger.week !== week) {
    ledger.week = week;
    ledger.weekly = {};
  }
}

/** How much more of a source can be earned right now. */
export function earnable(ledger: Ledger, source: EarnSource): number {
  const cap = EARN_CAPS[source];
  let room = Infinity;
  if (cap.daily !== undefined) room = Math.min(room, cap.daily - (ledger.daily[source] ?? 0));
  if (cap.weekly !== undefined) room = Math.min(room, cap.weekly - (ledger.weekly[source] ?? 0));
  return Math.max(0, room);
}

/** Count an amount against the caps and return how much is actually granted. Mutates the ledger. */
export function earn(ledger: Ledger, source: EarnSource, amount: number, now: number): number {
  rollLedger(ledger, now);
  const granted = Math.max(0, Math.min(Math.round(amount), earnable(ledger, source)));
  if (granted > 0) {
    ledger.daily[source] = (ledger.daily[source] ?? 0) + granted;
    ledger.weekly[source] = (ledger.weekly[source] ?? 0) + granted;
  }
  return granted;
}
