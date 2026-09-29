import { PASS_BONUS } from './constants';
import { estimateHit } from './damage';
import type { Action, EffectDef, SkillDef } from './defs';
import { chainBonus, legalActions, resolveTargets, scopeUnits, skillActionsFor } from './engine';
import type { BattleState, Unit } from './state';
import { getUnit, hpFrac, living, passive } from './util';

/**
 * A readable heuristic player. It powers auto-battle for players and the balance simulations,
 * so it only uses information a player can see: stats, weaknesses, intents and the Lantern pool.
 */

function isDangerous(foe: Unit): boolean {
  const skill = foe.foeKit.find((k) => k.id === foe.intent?.skill);
  return !!skill && (skill.heavy === true || skill.power >= 1.6 || skill.target === 'allEnemies');
}

function effectValue(s: BattleState, actor: Unit, skill: SkillDef, targets: Unit[], e: EffectDef): number {
  switch (e.type) {
    case 'mod': {
      let v = 0;
      for (const t of scopeUnits(s, actor, targets, e.on)) {
        if (t.mods.some((m) => m.key === `${skill.id}:${e.stat}`)) continue;
        if (e.pct > 0 && t.side === actor.side) v += 60;
        if (e.pct < 0 && t.side !== actor.side) v += 45;
      }
      return v;
    }
    case 'heal': {
      let v = 0;
      for (const t of scopeUnits(s, actor, targets, e.on)) {
        const amount = e.of === 'atk' ? e.scale * actor.stats.atk : e.scale * t.maxHp;
        const missing = t.maxHp - t.hp;
        if (missing < t.maxHp * 0.1) continue;
        v += Math.min(amount, missing) + (hpFrac(t) < 0.4 ? 180 : 0);
      }
      return v;
    }
    case 'delay': {
      let v = 0;
      for (const t of scopeUnits(s, actor, targets, e.on)) if (t.side !== actor.side) v += 35 + (isDangerous(t) ? 120 : 0);
      return v;
    }
    case 'advance':
      return 20 * scopeUnits(s, actor, targets, e.on).length;
    case 'taunt':
      return living(s, 'foe').some(isDangerous) ? 50 : 15;
    case 'gauge':
      return e.amount * 0.6 * scopeUnits(s, actor, targets, e.on).length;
  }
}

function scoreSkill(s: BattleState, unit: Unit, skill: SkillDef, targetId: string | undefined, bonus: number): number {
  const targets = resolveTargets(s, unit, skill, targetId);
  let score = 0;
  let weakOnStanding = false;
  if (skill.power > 0) {
    for (const t of targets) {
      const est = estimateHit(unit, t, skill, skill.power, bonus);
      let v = Math.min(est.amount, t.hp);
      if (est.weak && !t.broken && t.maxShell > 0) {
        const cut = skill.shell + passive(unit, 'shellBonus');
        v += 55 * Math.min(cut, t.shell);
        if (cut >= t.shell) v += 240;
        weakOnStanding = true;
      }
      if (est.resist) v *= 0.7;
      if (est.amount >= t.hp) v += 160 + t.stats.atk;
      score += v;
    }
    if (weakOnStanding) score += 110;
  }
  for (const e of skill.effects ?? []) score += effectValue(s, unit, skill, targets, e);
  score += skill.lantern > 0 ? 30 * skill.lantern : 20 * skill.lantern;
  score += 0.6 * skill.gauge;
  return score;
}

function bestSkillScore(s: BattleState, unit: Unit, bonus: number): number {
  let best = 0;
  for (const a of skillActionsFor(s, unit)) {
    if (a.type !== 'skill' || !unit.kit) continue;
    best = Math.max(best, scoreSkill(s, unit, unit.kit[a.skill], a.target, bonus));
  }
  return best;
}

function scoreAction(s: BattleState, actor: Unit, a: Action, bonus: number): number {
  switch (a.type) {
    case 'skill':
      return scoreSkill(s, actor, actor.kit![a.skill], a.target, bonus);
    case 'ultimate': {
      const unit = getUnit(s, a.unit);
      return scoreSkill(s, unit, unit.kit!.ultimate, a.target, 1) * 1.1 + 40;
    }
    case 'burst':
      return 3000;
    case 'guard': {
      const wounded = living(s, 'party').some((u) => hpFrac(u) < 0.35);
      return 25 + (wounded ? 40 : 0) + (s.lantern === 0 ? 20 : 0);
    }
    case 'pass': {
      const ally = getUnit(s, a.to);
      const passes = s.chain?.passCount ?? 0;
      return bestSkillScore(s, ally, 1 + PASS_BONUS * (passes + 1)) - 4;
    }
  }
}

/** The action the heuristic player would take now, or null when no input is expected. */
export function choosePartyAction(s: BattleState): Action | null {
  if (s.awaiting.type !== 'input') return null;
  const actor = getUnit(s, s.awaiting.actor);
  const bonus = chainBonus(s, actor);
  let best: Action | null = null;
  let bestScore = -Infinity;
  for (const a of legalActions(s)) {
    const score = scoreAction(s, actor, a, bonus);
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}
