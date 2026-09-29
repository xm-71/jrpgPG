import type { Affinity } from '../types';
import type { EnemyAi, SkillDef, UnitSetup } from './defs';

/** Small builders for engine tests. Not exported from the package. */

export function skill(over: Partial<SkillDef> & { id: string }): SkillDef {
  return {
    name: over.id,
    kind: 'basic',
    affinity: null,
    target: 'enemy',
    power: 1,
    shell: 1,
    lantern: 1,
    gauge: 10,
    blurb: '',
    ...over,
  };
}

export interface HeroOpts {
  affinity?: Affinity | null;
  spd?: number;
  atk?: number;
  hp?: number;
  def?: number;
  gauge?: number;
  basic?: Partial<SkillDef>;
  skill?: Partial<SkillDef>;
  ultimate?: Partial<SkillDef>;
  passives?: UnitSetup['passives'];
}

export function hero(id: string, o: HeroOpts = {}): UnitSetup {
  const affinity = o.affinity === undefined ? 'flame' : o.affinity;
  return {
    id,
    defId: id,
    name: id,
    affinity,
    stats: { hp: o.hp ?? 1000, atk: o.atk ?? 100, def: o.def ?? 50, spd: o.spd ?? 100 },
    ...(o.gauge !== undefined ? { gauge: o.gauge } : {}),
    ...(o.passives ? { passives: o.passives } : {}),
    kit: {
      basic: skill({ id: `${id}-basic`, kind: 'basic', affinity, power: 1, shell: 1, lantern: 1, gauge: 10, ...o.basic }),
      skill: skill({ id: `${id}-skill`, kind: 'skill', affinity, power: 2, shell: 2, lantern: -1, gauge: 6, ...o.skill }),
      ultimate: skill({ id: `${id}-ult`, kind: 'ultimate', affinity, power: 4, shell: 3, lantern: 0, gauge: 0, ...o.ultimate }),
    },
  };
}

export interface FoeOpts {
  spd?: number;
  atk?: number;
  hp?: number;
  def?: number;
  shell?: number;
  weaknesses?: Affinity[];
  resists?: Affinity[];
  ai?: EnemyAi;
  skills?: SkillDef[];
}

export function foe(id: string, o: FoeOpts = {}): UnitSetup {
  return {
    id,
    defId: id,
    name: id,
    affinity: null,
    stats: { hp: o.hp ?? 400, atk: o.atk ?? 60, def: o.def ?? 40, spd: o.spd ?? 80 },
    shell: o.shell ?? 3,
    weaknesses: o.weaknesses ?? ['flame'],
    ...(o.resists ? { resists: o.resists } : {}),
    ...(o.ai ? { ai: o.ai } : {}),
    foeKit: o.skills ?? [skill({ id: `${id}-nip`, kind: 'skill', target: 'enemy', power: 1, shell: 0, lantern: 0, gauge: 0 })],
  };
}
