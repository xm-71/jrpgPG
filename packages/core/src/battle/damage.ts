import type { Affinity } from '../types';
import { BREAK_MULT, CRIT_MULT, RESIST_MULT, WEAK_MULT } from './constants';
import type { SkillDef } from './defs';
import type { Unit } from './state';
import { effStat } from './util';

export interface DamageRoll {
  amount: number;
  weak: boolean;
  resist: boolean;
}

/**
 * The one damage formula. The engine rolls crit and variance and passes them in;
 * previews and the auto-play policy pass the neutral values.
 */
export function damageAmount(
  actor: Unit,
  target: Unit,
  affinity: Affinity | null,
  power: number,
  bonus: number,
  guardMult: number,
  crit: boolean,
  variance: number,
): DamageRoll {
  const weak = affinity !== null && target.weaknesses.includes(affinity);
  const resist = affinity !== null && !weak && target.resists.includes(affinity);
  const raw =
    effStat(actor, 'atk') *
    power *
    (100 / (100 + effStat(target, 'def'))) *
    (weak ? WEAK_MULT : resist ? RESIST_MULT : 1) *
    (target.broken ? BREAK_MULT : 1) *
    (crit ? CRIT_MULT : 1) *
    bonus *
    guardMult *
    variance;
  return { amount: Math.max(1, Math.round(raw)), weak, resist };
}

/** Expected damage without luck, for previews and the auto-play policy. */
export function estimateHit(
  actor: Unit,
  target: Unit,
  skill: SkillDef,
  power: number = skill.power,
  bonus = 1,
): DamageRoll {
  return damageAmount(actor, target, skill.affinity, power, bonus, target.guarding ? 0.5 : 1, false, 1);
}
