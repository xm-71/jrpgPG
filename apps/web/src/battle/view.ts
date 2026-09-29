import {
  burstLegal,
  planFor,
  previewTimeline,
  type Action,
  type Affinity,
  type Battle,
  type BattleEvent,
  type BattleState,
  type ModStat,
  type Side,
  type TimelineEntry,
  type Unit,
} from '@duskline/core';

/**
 * What the screen shows. The engine resolves a whole action at once; the controller plays its
 * events back one at a time and applies each to this view, so bars and numbers move in step
 * with the animation. When playback ends the view is rebuilt from the engine, which is the truth.
 */

export interface IntentView {
  name: string;
  target: string | null;
  heavy: boolean;
  aoe: boolean;
}

export interface ModView {
  stat: ModStat | 'taunt';
  pct: number;
  turns: number;
}

export interface UnitView {
  id: string;
  defId: string;
  name: string;
  side: Side;
  slot: number;
  tier: string;
  affinity: Affinity | null;
  hp: number;
  maxHp: number;
  shell: number;
  maxShell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  broken: boolean;
  hardened: boolean;
  gauge: number;
  alive: boolean;
  guarding: boolean;
  mods: ModView[];
  intent: IntentView | null;
}

export interface BattleView {
  units: UnitView[];
  lantern: number;
  order: TimelineEntry[];
  awaiting: { actor: string; mode: 'turn' | 'encore' | 'passed' } | null;
  /** Allies the baton can be passed to right now. */
  passTargets: string[];
  burstReady: boolean;
  canSkill: boolean;
  result: 'victory' | 'defeat' | null;
}

function unitView(u: Unit): UnitView {
  const intentSkill = u.intent ? u.foeKit.find((k) => k.id === u.intent?.skill) : undefined;
  return {
    id: u.id,
    defId: u.defId,
    name: u.name,
    side: u.side,
    slot: u.slot,
    tier: u.tier,
    affinity: u.affinity,
    hp: u.hp,
    maxHp: u.maxHp,
    shell: u.shell,
    maxShell: u.maxShell,
    weaknesses: [...u.weaknesses],
    resists: [...u.resists],
    broken: u.broken,
    hardened: u.hardened,
    gauge: u.gauge,
    alive: u.alive,
    guarding: u.guarding,
    mods: u.mods.map((m) => ({ stat: m.stat, pct: m.pct, turns: m.turns })),
    intent:
      u.intent && intentSkill
        ? { name: intentSkill.name, target: u.intent.target, heavy: intentSkill.heavy === true || intentSkill.power >= 1.6, aoe: intentSkill.target === 'allEnemies' }
        : null,
  };
}

/** A pending choice, so the turn-order bar can preview how it would reorder things. */
export function snapshot(battle: Battle, preview?: Action | null): BattleView {
  const s: BattleState = battle.state;
  const aw = s.awaiting;
  const actor = aw.type === 'input' ? s.units.find((u) => u.id === aw.actor) : undefined;
  const plan = preview && aw.type === 'input' ? planFor(s, preview) : {};
  const passTargets =
    aw.type === 'input' && aw.mode === 'encore' && s.chain
      ? s.units.filter((u) => u.side === 'party' && u.alive && !s.chain!.used.includes(u.id)).map((u) => u.id)
      : [];
  return {
    units: s.units.map(unitView),
    lantern: s.lantern,
    order: previewTimeline(s, 8, plan),
    awaiting: aw.type === 'input' ? { actor: aw.actor, mode: aw.mode } : null,
    passTargets,
    burstReady: aw.type === 'input' && burstLegal(s),
    canSkill: !!actor?.kit && s.lantern >= -actor.kit.skill.lantern,
    result: s.result,
  };
}

const unit = (v: BattleView, id: string): UnitView | undefined => v.units.find((u) => u.id === id);

/** Apply one engine event to the view, in place. */
export function applyEvent(v: BattleView, e: BattleEvent): void {
  switch (e.t) {
    case 'hit': {
      const u = unit(v, e.target);
      if (u) {
        u.hp = e.hp;
        u.shell = e.shell;
        if (e.hp <= 0) u.alive = false;
      }
      break;
    }
    case 'heal': {
      const u = unit(v, e.target);
      if (u) u.hp = e.hp;
      break;
    }
    case 'gauge': {
      const u = unit(v, e.unit);
      if (u) u.gauge = e.value;
      break;
    }
    case 'lantern':
      v.lantern = e.value;
      break;
    case 'ko': {
      const u = unit(v, e.unit);
      if (u) {
        u.alive = false;
        u.hp = 0;
        u.intent = null;
      }
      break;
    }
    case 'break': {
      const u = unit(v, e.unit);
      if (u) {
        u.broken = true;
        u.intent = null;
      }
      break;
    }
    case 'recover': {
      const u = unit(v, e.unit);
      if (u) {
        u.broken = false;
        u.shell = e.shell;
        u.hardened = u.maxShell > 0;
      }
      break;
    }
    case 'intent': {
      const u = unit(v, e.unit);
      if (u) u.intent = { name: e.name, target: e.target, heavy: e.heavy, aoe: e.aoe };
      break;
    }
    case 'act': {
      const u = unit(v, e.actor);
      if (u && u.side === 'foe') {
        u.intent = null;
        u.hardened = false;
      }
      break;
    }
    case 'mod': {
      const u = unit(v, e.target);
      if (u) {
        const i = u.mods.findIndex((m) => m.stat === e.stat && Math.sign(m.pct) === Math.sign(e.pct));
        const next: ModView = { stat: e.stat, pct: e.pct, turns: e.turns };
        if (i >= 0) u.mods[i] = next;
        else u.mods.push(next);
      }
      break;
    }
    case 'end':
      v.result = e.result;
      break;
    default:
      break;
  }
}
