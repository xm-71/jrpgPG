import {
  incoming,
  intentOf,
  living,
  maxLight,
  moveHit,
  type Affinity,
  type CardBattleState,
  type CardEvent,
  type CardInstance,
  type FoeMove,
  type FoeState,
  type Statuses,
} from '@duskline/core';

/**
 * What the battle screen shows. The engine settles a whole action at once; the controller plays
 * its events back one at a time and applies each one here, so bars and numbers move in step with
 * the animation. When playback ends the view is rebuilt from the engine, which is the truth.
 */

export type IntentPart = 'attack' | 'ward' | 'rage' | 'heal' | 'curse' | 'summon' | 'chill' | 'hex' | 'dim' | 'shatter';

export interface IntentView {
  id: string;
  name: string;
  perHit: number;
  hits: number;
  pierce: boolean;
  parts: IntentPart[];
  heavy: boolean;
}

export interface FoeView {
  id: string;
  defId: string;
  name: string;
  family: string;
  tier: string;
  slot: number;
  hp: number;
  maxHp: number;
  ward: number;
  shell: number;
  maxShell: number;
  broken: boolean;
  hardened: boolean;
  alive: boolean;
  statuses: Statuses;
  weaknesses: Affinity[];
  resists: Affinity[];
  intent: IntentView | null;
}

export interface HeroView {
  hp: number;
  maxHp: number;
  ward: number;
  gauge: number;
  statuses: Statuses;
}

export interface BattleView {
  turn: number;
  light: number;
  maxLight: number;
  hero: HeroView;
  foes: FoeView[];
  hand: CardInstance[];
  drawCount: number;
  discardCount: number;
  spentCount: number;
  chain: { steps: number; affinity: Affinity | null };
  incoming: { damage: number; pierce: number; ward: number; taken: number };
  result: 'victory' | 'defeat' | null;
}

function parts(m: FoeMove): IntentPart[] {
  const out: IntentPart[] = [];
  if (m.shatter) out.push('shatter');
  if (m.dmg) out.push('attack');
  if (m.ward || m.wardAll) out.push('ward');
  if (m.rage || m.rageAll) out.push('rage');
  if (m.heal || m.healAll) out.push('heal');
  if (m.curse) out.push('curse');
  if (m.summon) out.push('summon');
  if (m.afflict) out.push(m.afflict.status as IntentPart);
  return out;
}

export function intentView(s: CardBattleState, f: FoeState): IntentView | null {
  const m = intentOf(f);
  if (!m || f.broken || !f.alive) return null;
  const perHit = moveHit(s, f, m);
  return { id: m.id, name: m.name, perHit, hits: m.hits ?? 1, pierce: m.pierce === true, parts: parts(m), heavy: perHit * (m.hits ?? 1) >= 14 };
}

function foeView(s: CardBattleState, f: FoeState): FoeView {
  return {
    id: f.id,
    defId: f.defId,
    name: f.name,
    family: f.family,
    tier: f.tier,
    slot: f.slot,
    hp: f.hp,
    maxHp: f.maxHp,
    ward: f.ward,
    shell: f.shell,
    maxShell: f.maxShell,
    broken: f.broken,
    hardened: f.hardened,
    alive: f.alive,
    statuses: { ...f.statuses },
    weaknesses: [...f.weaknesses],
    resists: [...f.resists],
    intent: intentView(s, f),
  };
}

export function snapshot(s: CardBattleState): BattleView {
  return {
    turn: s.turn,
    light: s.light,
    maxLight: maxLight(s),
    hero: { hp: s.hero.hp, maxHp: s.hero.maxHp, ward: s.hero.ward, gauge: s.hero.gauge, statuses: { ...s.hero.statuses } },
    foes: s.foes.map((f) => foeView(s, f)),
    hand: s.hand.map((c) => ({ ...c })),
    drawCount: s.draw.length,
    discardCount: s.discard.length,
    spentCount: s.spent.length,
    chain: { steps: s.chain.steps, affinity: s.chain.affinity },
    incoming: s.over ? { damage: 0, pierce: 0, ward: s.hero.ward, taken: 0 } : incoming(s),
    result: s.result,
  };
}

const foe = (v: BattleView, id: string): FoeView | undefined => v.foes.find((f) => f.id === id);

function findCard(s: CardBattleState, uid: number): CardInstance {
  for (const pile of [s.hand, s.draw, s.discard, s.spent]) {
    const c = pile.find((x) => x.uid === uid);
    if (c) return { ...c };
  }
  return { uid, id: 'ash' };
}

/** Apply one engine event to the view, in place. `after` is the engine state once the action settled. */
export function applyEvent(v: BattleView, e: CardEvent, after: CardBattleState): void {
  switch (e.t) {
    case 'turn':
      v.turn = e.turn;
      v.light = e.light;
      v.chain = { steps: 0, affinity: null };
      break;
    case 'draw':
      for (const uid of e.uids) v.hand.push(findCard(after, uid));
      v.drawCount = Math.max(0, v.drawCount - e.uids.length);
      break;
    case 'shuffle':
      v.drawCount = e.count;
      v.discardCount = 0;
      break;
    case 'play':
      v.hand = v.hand.filter((c) => c.uid !== e.uid);
      v.light = e.light;
      if (e.to === 'spent') v.spentCount++;
      else v.discardCount++;
      break;
    case 'chain':
      v.chain = { steps: e.steps, affinity: e.affinity };
      break;
    case 'hit': {
      const f = foe(v, e.target);
      if (f) {
        f.hp = e.hp;
        f.ward = e.ward;
        f.shell = e.shell;
      }
      break;
    }
    case 'crack': {
      const f = foe(v, e.unit);
      if (f) f.shell = e.shell;
      break;
    }
    case 'break': {
      const f = foe(v, e.unit);
      if (f) {
        f.broken = true;
        f.intent = null;
      }
      break;
    }
    case 'recover': {
      const f = foe(v, e.unit);
      if (f) {
        f.broken = false;
        f.shell = e.shell;
        f.hardened = f.maxShell > 0;
      }
      break;
    }
    case 'ko': {
      const f = foe(v, e.unit);
      if (f) {
        f.alive = false;
        f.hp = 0;
        f.intent = null;
        f.ward = 0;
      }
      break;
    }
    case 'status': {
      const target = e.unit === 'hero' ? v.hero.statuses : foe(v, e.unit)?.statuses;
      if (target) {
        if (e.stacks > 0) target[e.status] = e.stacks;
        else delete target[e.status];
      }
      break;
    }
    case 'heal':
      if (e.unit === 'hero') v.hero.hp = e.hp;
      else {
        const f = foe(v, e.unit);
        if (f) f.hp = e.hp;
      }
      break;
    case 'ward':
      if (e.unit === 'hero') v.hero.ward = e.value;
      else {
        const f = foe(v, e.unit);
        if (f) f.ward = e.value;
      }
      break;
    case 'light':
      v.light = e.value;
      break;
    case 'gauge':
      v.hero.gauge = e.value;
      break;
    case 'ultimate':
      v.hand.push(findCard(after, e.uid));
      break;
    case 'spend':
      v.hand = v.hand.filter((c) => !e.uids.includes(c.uid));
      v.spentCount += e.uids.length;
      break;
    case 'discard':
      v.hand = v.hand.filter((c) => !e.uids.includes(c.uid));
      v.discardCount += e.uids.length;
      break;
    case 'heroHit':
      v.hero.hp = e.hp;
      v.hero.ward = e.ward;
      break;
    case 'burn': {
      const f = foe(v, e.unit);
      if (f) f.hp = e.hp;
      break;
    }
    case 'move': {
      const f = foe(v, e.unit);
      if (f) f.hardened = false;
      break;
    }
    case 'intent': {
      const f = foe(v, e.unit);
      const real = after.foes.find((x) => x.id === e.unit);
      if (f) f.intent = real && e.move ? intentView(after, real) : null;
      break;
    }
    case 'shatter':
      v.hero.ward = e.ward;
      break;
    case 'curse':
      v.discardCount += e.count;
      break;
    case 'summon': {
      const real = after.foes.find((x) => x.id === e.unit);
      if (real && !foe(v, e.unit)) v.foes.push(foeView(after, real));
      break;
    }
    case 'end':
      v.result = e.result;
      break;
    default:
      break;
  }
}

export const aliveFoes = (s: CardBattleState): FoeState[] => living(s);
