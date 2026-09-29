import type { Passive, SkillDef, TargetKind } from '@duskline/core';

const pct = (v: number): string => `${Math.round(v * 1000) / 10}%`;

/** Plain-language description of a passive, scaled by a card's copy strength. */
export function describePassive(p: Passive, k = 1): string {
  switch (p.type) {
    case 'stat': {
      const name = { hp: 'max HP', atk: 'ATK', def: 'DEF', spd: 'SPD' }[p.stat];
      return `${p.pct >= 0 ? '+' : ''}${pct(p.pct * k)} ${name}`;
    }
    case 'startGauge':
      return `Start battles with ${Math.round(p.value * k)} ultimate charge`;
    case 'startLantern':
      return `Start battles with ${Math.round(p.value * k)} more Lantern`;
    case 'shellBonus':
      return `Weakness hits remove ${Math.round(p.value * k)} more Shell`;
    case 'breakHeal':
      return `Breaking an enemy heals the party ${pct(p.value * k)} of max HP`;
    case 'encoreDamage':
      return `Encore and passed actions deal ${pct(p.value * k)} more damage`;
    case 'burstDamage':
      return `Horizon Burst deals ${pct(p.value * k)} more damage`;
    case 'healPower':
      return `Healing is ${pct(p.value * k)} stronger`;
    case 'gaugeGain':
      return `Ultimates charge ${pct(p.value * k)} faster`;
    case 'guardPower':
      return `Guarding blocks ${pct(p.value * k)} more damage`;
  }
}

export const TARGET_LABEL: Record<TargetKind, string> = {
  enemy: 'One enemy',
  allEnemies: 'All enemies',
  ally: 'One ally',
  allAllies: 'Whole party',
  self: 'Self',
};

export function skillCost(s: SkillDef): string {
  if (s.kind === 'ultimate') return 'Ultimate: full gauge';
  if (s.lantern > 0) return `Builds ${s.lantern} Lantern`;
  return `Costs ${-s.lantern} Lantern`;
}

export function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
