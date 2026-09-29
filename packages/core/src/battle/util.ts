import type { Side } from '../types';
import { INTERVAL } from './constants';
import type { ModStat, ValuePassive } from './defs';
import type { BattleState, Unit } from './state';

export function getUnit(s: BattleState, id: string): Unit {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unit: ${id}`);
  return u;
}

export function living(s: BattleState, side: Side): Unit[] {
  return s.units.filter((u) => u.alive && u.side === side);
}

/** Living units on the other side from `u`. */
export function opposing(s: BattleState, u: Unit): Unit[] {
  return living(s, u.side === 'party' ? 'foe' : 'party');
}

/** A stat with active buffs and debuffs applied. Never below a quarter of base. */
export function effStat(u: Unit, stat: ModStat): number {
  let pct = 0;
  for (const m of u.mods) if (m.stat === stat) pct += m.pct;
  const base = u.stats[stat];
  return Math.max(base * 0.25, base * (1 + pct));
}

/** Time between this unit's turns. */
export function cycleOf(u: Unit): number {
  return INTERVAL / Math.max(1, effStat(u, 'spd'));
}

export function hasTaunt(u: Unit): boolean {
  return u.mods.some((m) => m.stat === 'taunt');
}

/** Sum of a value passive across the unit's passives. */
export function passive(u: Unit, type: ValuePassive['type']): number {
  let total = 0;
  for (const p of u.passives) if (p.type === type) total += p.value;
  return total;
}

export function hpFrac(u: Unit): number {
  return u.maxHp > 0 ? u.hp / u.maxHp : 0;
}

export function lowestHpFrac(units: Unit[]): Unit | undefined {
  let best: Unit | undefined;
  for (const u of units) if (!best || hpFrac(u) < hpFrac(best)) best = u;
  return best;
}
