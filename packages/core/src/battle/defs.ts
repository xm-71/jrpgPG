import type { Affinity, Stats } from '../types';

export type SkillKind = 'basic' | 'skill' | 'ultimate';

/** Targets are relative to the caster: 'enemy' is the opposing side, 'ally' the caster's own side. */
export type TargetKind = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self';

/** Who an effect lands on: the skill's primary targets, the caster, the caster's side, or the opposing side. */
export type EffectScope = 'targets' | 'self' | 'party' | 'foes';

export type ModStat = 'atk' | 'def' | 'spd';

export type EffectDef =
  | { type: 'mod'; on: EffectScope; stat: ModStat; pct: number; turns: number }
  | { type: 'heal'; on: EffectScope; of: 'atk' | 'maxHp'; scale: number }
  | { type: 'delay'; on: EffectScope; pct: number }
  | { type: 'advance'; on: EffectScope; pct: number }
  | { type: 'taunt'; turns: number }
  | { type: 'gauge'; on: EffectScope; amount: number };

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  affinity: Affinity | null;
  target: TargetKind;
  /** Damage as a multiple of the caster's attack. Zero for pure support. */
  power: number;
  /** Shell removed from each standing enemy that is weak to the skill's affinity. */
  shell: number;
  /** Lantern change: +1 builds, -1 costs one. Party skills only. */
  lantern: number;
  /** Ultimate gauge the caster gains. */
  gauge: number;
  /** Multiplier on the caster's wait before its next turn. Default 1. */
  timeCost?: number;
  effects?: EffectDef[];
  /** Enemy skills: shown as a warning on the intent icon. */
  heavy?: boolean;
  blurb: string;
}

export interface Kit {
  basic: SkillDef;
  skill: SkillDef;
  ultimate: SkillDef;
}

/** Small numeric modifiers from Resonance, Memory Cards and Glimmers. */
export type Passive =
  | { type: 'stat'; stat: 'hp' | 'atk' | 'def' | 'spd'; pct: number }
  | { type: 'startGauge'; value: number }
  | { type: 'startLantern'; value: number }
  | { type: 'shellBonus'; value: number }
  | { type: 'breakHeal'; value: number }
  | { type: 'encoreDamage'; value: number }
  | { type: 'burstDamage'; value: number }
  | { type: 'healPower'; value: number }
  | { type: 'gaugeGain'; value: number }
  | { type: 'guardPower'; value: number };

export type ValuePassive = Exclude<Passive, { type: 'stat' }>;

export type FoeFocus = 'random' | 'lowestHp' | 'highestAtk';

export interface EnemyAi {
  /** Skill ids used in order, repeating. When absent, skills are picked by weight. */
  pattern?: string[];
  weights?: Record<string, number>;
  focus?: FoeFocus;
}

export type Tier = 'hero' | 'mob' | 'elite' | 'boss';

export interface UnitSetup {
  /** Unique within the battle. */
  id: string;
  /** Content id, used by the client to look up art. */
  defId: string;
  name: string;
  affinity: Affinity | null;
  /** Final combat stats, already scaled for level and Resonance. */
  stats: Stats;
  tier?: Tier;
  // Party units
  kit?: Kit;
  // Enemy units
  foeKit?: SkillDef[];
  shell?: number;
  weaknesses?: Affinity[];
  resists?: Affinity[];
  ai?: EnemyAi;
  // Both
  passives?: Passive[];
  /** Starting HP as a fraction of max, for Descent carry-over. Default 1. */
  hpPct?: number;
  /** Starting ultimate gauge. */
  gauge?: number;
}

export interface BattleSetup {
  party: UnitSetup[];
  foes: UnitSetup[];
  /** Applied to every party member (Glimmers). startLantern here counts once, not per unit. */
  partyPassives?: Passive[];
  startLantern?: number;
}

/** Player input. The actor is implied by whose turn it is, except for ultimates. */
export type Action =
  | { type: 'skill'; skill: 'basic' | 'skill'; target?: string }
  | { type: 'guard' }
  | { type: 'ultimate'; unit: string; target?: string }
  | { type: 'burst' }
  | { type: 'pass'; to: string };
