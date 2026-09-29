export const AFFINITIES = ['sun', 'moon', 'flame', 'frost', 'gale', 'volt'] as const;
export type Affinity = (typeof AFFINITIES)[number];

export type Side = 'party' | 'foe';

export type Stat = 'hp' | 'atk' | 'def' | 'spd';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export type Role = 'striker' | 'breaker' | 'defender' | 'support' | 'debuffer' | 'healer' | 'burst';

export type Rarity = 3 | 4 | 5;
