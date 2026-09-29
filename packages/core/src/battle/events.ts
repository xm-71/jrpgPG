import type { Affinity } from '../types';
import type { ModStat, SkillKind } from './defs';
import type { BattleResult } from './state';

/**
 * Everything the engine reports, in order. The client plays these back as animation;
 * the numbers carried here (hp, shell, gauge, lantern) let it update bars step by step.
 */
export type BattleEvent =
  | { t: 'turn'; unit: string; mode: 'turn' | 'encore' | 'passed' }
  | { t: 'foeTurn'; unit: string }
  | { t: 'intent'; unit: string; skill: string; name: string; target: string | null; heavy: boolean; aoe: boolean }
  | { t: 'act'; actor: string; skill: string; name: string; kind: SkillKind | 'guard'; targets: string[]; affinity: Affinity | null }
  | {
      t: 'hit';
      actor: string;
      target: string;
      amount: number;
      hp: number;
      shell: number;
      crit: boolean;
      weak: boolean;
      resist: boolean;
      broke: boolean;
    }
  | { t: 'heal'; actor: string; target: string; amount: number; hp: number }
  | { t: 'mod'; target: string; stat: ModStat | 'taunt'; pct: number; turns: number }
  | { t: 'delay'; target: string; pct: number }
  | { t: 'advance'; target: string; pct: number }
  | { t: 'gauge'; unit: string; value: number }
  | { t: 'lantern'; value: number }
  | { t: 'ko'; unit: string }
  | { t: 'break'; unit: string }
  | { t: 'skip'; unit: string; reason: 'broken' }
  | { t: 'recover'; unit: string; shell: number }
  | { t: 'encore'; unit: string }
  | { t: 'pass'; from: string; to: string; count: number }
  | { t: 'burst'; actor: string }
  | { t: 'ult'; unit: string; name: string }
  | { t: 'end'; result: BattleResult; reason?: 'timeout' };
