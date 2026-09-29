import { rngInt, rngNext } from '../rng';
import type { SkillDef } from './defs';
import type { BattleEvent } from './events';
import type { BattleState, Unit } from './state';
import { hasTaunt, living } from './util';

/** Choose which party member a single-target enemy skill aims at. Taunt always wins. */
export function chooseFoeTarget(s: BattleState, foe: Unit): Unit | undefined {
  const party = living(s, 'party');
  if (party.length === 0) return undefined;
  const taunter = party.find(hasTaunt);
  if (taunter) return taunter;
  switch (foe.ai?.focus ?? 'random') {
    case 'lowestHp': {
      let best = party[0]!;
      for (const p of party) if (p.hp < best.hp) best = p;
      return best;
    }
    case 'highestAtk': {
      let best = party[0]!;
      for (const p of party) if (p.stats.atk > best.stats.atk) best = p;
      return best;
    }
    default:
      return party[rngInt(s.rng, party.length)];
  }
}

function chooseSkill(s: BattleState, foe: Unit): SkillDef | undefined {
  const kit = foe.foeKit;
  if (kit.length === 0) return undefined;
  const ai = foe.ai;
  if (ai?.pattern && ai.pattern.length > 0) {
    const id = ai.pattern[foe.aiIndex % ai.pattern.length];
    foe.aiIndex++;
    return kit.find((k) => k.id === id) ?? kit[0];
  }
  let total = 0;
  for (const k of kit) total += ai?.weights?.[k.id] ?? 1;
  let roll = rngNext(s.rng) * total;
  for (const k of kit) {
    roll -= ai?.weights?.[k.id] ?? 1;
    if (roll < 0) return k;
  }
  return kit[kit.length - 1];
}

/** Declare the foe's next action so the player can see it coming. */
export function pickIntent(s: BattleState, foe: Unit, ev: BattleEvent[]): void {
  if (!foe.alive || foe.broken) {
    foe.intent = null;
    return;
  }
  const skill = chooseSkill(s, foe);
  if (!skill) {
    foe.intent = null;
    return;
  }
  let target: string | null = null;
  if (skill.target === 'enemy') target = chooseFoeTarget(s, foe)?.id ?? null;
  foe.intent = { skill: skill.id, target };
  ev.push({
    t: 'intent',
    unit: foe.id,
    skill: skill.id,
    name: skill.name,
    target,
    heavy: skill.heavy === true || skill.power >= 1.6,
    aoe: skill.target === 'allEnemies',
  });
}
