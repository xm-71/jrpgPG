import type { Passive, UnitSetup } from './battle/defs';
import { applyResonance, statsAtLevel } from './battle/scaling';
import type { CardDef, EncounterDef, EnemyDef, HeroDef } from './data';

/** Turn data definitions into battle units. */

export interface CarryOver {
  /** Starting HP as a fraction of max, for Descent carry-over. */
  hpPct?: number;
  /** Starting ultimate gauge. */
  gauge?: number;
}

export function heroUnit(
  def: HeroDef,
  rank: number,
  resonance = 1,
  passives: Passive[] = [],
  carry: CarryOver = {},
): UnitSetup {
  return {
    id: def.id,
    defId: def.id,
    name: def.name,
    affinity: def.affinity,
    stats: applyResonance(statsAtLevel(def.base, rank), resonance),
    tier: 'hero',
    kit: def.kit,
    passives,
    ...(carry.hpPct !== undefined ? { hpPct: carry.hpPct } : {}),
    ...(carry.gauge !== undefined ? { gauge: carry.gauge } : {}),
  };
}

export function foeUnit(def: EnemyDef, level: number, id: string): UnitSetup {
  return {
    id,
    defId: def.id,
    name: def.name,
    affinity: null,
    stats: statsAtLevel(def.base, level),
    tier: def.tier,
    foeKit: def.foeKit,
    shell: def.shell,
    weaknesses: def.weaknesses,
    resists: def.resists,
    ...(def.ai ? { ai: def.ai } : {}),
  };
}

/** Foes for an encounter, with ids like "f0:wisp". */
export function encounterFoes(
  encounter: EncounterDef,
  level: number,
  enemyById: (id: string) => EnemyDef,
): UnitSetup[] {
  return encounter.foes.map((spawn, slot) =>
    foeUnit(enemyById(spawn.enemy), Math.max(1, level + (spawn.levelOffset ?? 0)), `f${slot}:${spawn.enemy}`),
  );
}

/** Each extra copy of a card adds a quarter of its base effect, up to five copies. */
export function cardStrength(copies: number): number {
  return 1 + 0.25 * (Math.min(5, Math.max(1, Math.round(copies))) - 1);
}

export function cardPassives(def: CardDef, copies: number): Passive[] {
  const k = cardStrength(copies);
  return def.passives.map((p): Passive => (p.type === 'stat' ? { ...p, pct: p.pct * k } : { ...p, value: p.value * k }));
}
