import { GUARD_TIME_COST } from './constants';
import type { Action } from './defs';
import { resolveTargets, scopeUnits } from './engine';
import type { BattleState } from './state';
import { cycleOf, getUnit } from './util';

export interface TimelineEntry {
  unit: string;
  at: number;
  /** A Broken enemy's next turn is skipped. */
  skip: boolean;
  /** The unit acting right now. */
  current: boolean;
}

export interface TimelinePlan {
  /** Multiplier on the current actor's wait before its next turn. */
  actorCost?: number;
  /** Timeline shifts from delay and advance effects. */
  shifts?: Array<{ unit: string; delta: number }>;
}

/**
 * The next `count` turns in order. Pass a plan to see how a chosen action would reorder them,
 * which is what the turn-order bar shows while a skill is highlighted.
 */
export function previewTimeline(s: BattleState, count: number, plan: TimelinePlan = {}): TimelineEntry[] {
  const times = new Map<string, number>();
  const skips = new Set<string>();
  for (const u of s.units) {
    if (!u.alive) continue;
    times.set(u.id, u.nextAt);
    if (u.side === 'foe' && u.broken) skips.add(u.id);
  }

  const out: TimelineEntry[] = [];
  if (s.awaiting.type === 'input' && s.chain) {
    const origin = getUnit(s, s.chain.originator);
    out.push({ unit: origin.id, at: s.now, skip: false, current: true });
    times.set(origin.id, s.now + cycleOf(origin) * (plan.actorCost ?? 1));
  }
  for (const shift of plan.shifts ?? []) {
    const t = times.get(shift.unit);
    if (t !== undefined) times.set(shift.unit, Math.max(s.now, t + shift.delta));
  }

  while (out.length < count) {
    let bestId: string | null = null;
    let bestT = Infinity;
    for (const u of s.units) {
      const t = times.get(u.id);
      if (t === undefined) continue;
      const best = bestId === null ? null : getUnit(s, bestId);
      if (t < bestT || (t === bestT && best !== null && best.side === 'foe' && u.side === 'party')) {
        bestT = t;
        bestId = u.id;
      }
    }
    if (bestId === null) break;
    const unit = getUnit(s, bestId);
    out.push({ unit: bestId, at: bestT, skip: skips.delete(bestId), current: false });
    times.set(bestId, bestT + cycleOf(unit));
  }
  return out;
}

/** The timeline consequences of an action, for `previewTimeline`. */
export function planFor(s: BattleState, action: Action): TimelinePlan {
  if (s.awaiting.type !== 'input') return {};
  const actor = getUnit(s, s.awaiting.actor);
  if (action.type === 'guard') return { actorCost: GUARD_TIME_COST };
  if (action.type !== 'skill' || !actor.kit) return {};
  const skill = actor.kit[action.skill];
  const targets = resolveTargets(s, actor, skill, action.target);
  const shifts: Array<{ unit: string; delta: number }> = [];
  for (const e of skill.effects ?? []) {
    if (e.type !== 'delay' && e.type !== 'advance') continue;
    for (const t of scopeUnits(s, actor, targets, e.on)) {
      const delta = (e.type === 'delay' ? 1 : -1) * e.pct * cycleOf(t);
      shifts.push({ unit: t.id, delta });
    }
  }
  return { actorCost: skill.timeCost ?? 1, shifts };
}
