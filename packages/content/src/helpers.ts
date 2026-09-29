import type { Affinity, EffectDef, SkillDef, TargetKind } from '@duskline/core';

interface SkillOpts {
  id: string;
  name: string;
  blurb: string;
  affinity: Affinity | null;
  target?: TargetKind;
  power?: number;
  shell?: number;
  lantern?: number;
  gauge?: number;
  timeCost?: number;
  effects?: EffectDef[];
  heavy?: boolean;
}

/** A hero's basic attack: builds Lantern, chips Shell a little. */
export function basicAttack(o: SkillOpts): SkillDef {
  return { kind: 'basic', target: 'enemy', power: 1, shell: 1, lantern: 1, gauge: 10, ...o };
}

/** A hero's skill: spends one Lantern. */
export function skill(o: SkillOpts): SkillDef {
  return { kind: 'skill', target: 'enemy', power: 1, shell: 1, lantern: -1, gauge: 8, ...o };
}

/** A hero's ultimate: free to use once the gauge is full. */
export function ultimate(o: SkillOpts): SkillDef {
  return { kind: 'ultimate', target: 'enemy', power: 4, shell: 3, lantern: 0, gauge: 0, ...o };
}

/** An enemy skill. Enemies are not weak or strong to anything by their own affinity. */
export function foeSkill(o: Omit<SkillOpts, 'affinity'> & { affinity?: Affinity | null }): SkillDef {
  return { kind: 'skill', affinity: null, target: 'enemy', power: 1, shell: 0, lantern: 0, gauge: 0, ...o };
}
