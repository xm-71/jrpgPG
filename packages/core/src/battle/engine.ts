import { rngNext, seedRng } from '../rng';
import type { Side, Stats } from '../types';
import {
  BREAK_DELAY,
  BURST_GAUGE,
  BURST_POWER,
  CRIT_CHANCE,
  GAUGE_MAX,
  GAUGE_ON_BREAK,
  GAUGE_ON_HIT_BASE,
  GAUGE_ON_HIT_SCALE,
  GAUGE_ON_WEAK,
  GUARD_GAUGE,
  GUARD_MULT,
  GUARD_TIME_COST,
  INTERVAL,
  LANTERN_MAX,
  LANTERN_START,
  MAX_TURNS,
  PASS_BONUS,
  PASS_BONUS_CAP,
} from './constants';
import { damageAmount } from './damage';
import type { Action, BattleSetup, EffectScope, ModStat, Passive, SkillDef, UnitSetup, ValuePassive } from './defs';
import type { BattleEvent } from './events';
import { chooseFoeTarget, pickIntent } from './intent';
import type { BattleState, BattleStats, Unit } from './state';
import { cycleOf, effStat, getUnit, hasTaunt, living, lowestHpFrac, opposing, passive } from './util';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function sumPassives(list: readonly Passive[], type: ValuePassive['type']): number {
  let total = 0;
  for (const p of list) if (p.type === type) total += p.value;
  return total;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeUnit(us: UnitSetup, side: Side, slot: number, shared: readonly Passive[]): Unit {
  if (side === 'party' && !us.kit) throw new Error(`Party unit ${us.id} has no kit`);
  if (side === 'foe' && (!us.foeKit || us.foeKit.length === 0)) throw new Error(`Foe ${us.id} has no skills`);

  const passives = [...(us.passives ?? []), ...shared];
  const pct = { hp: 0, atk: 0, def: 0, spd: 0 };
  for (const p of passives) if (p.type === 'stat') pct[p.stat] += p.pct;
  const stats: Stats = {
    hp: Math.max(1, Math.round(us.stats.hp * (1 + pct.hp))),
    atk: us.stats.atk * (1 + pct.atk),
    def: us.stats.def * (1 + pct.def),
    spd: us.stats.spd * (1 + pct.spd),
  };
  const maxShell = us.shell ?? 0;
  const startGauge = (us.gauge ?? 0) + (side === 'party' ? sumPassives(passives, 'startGauge') : 0);
  return {
    id: us.id,
    defId: us.defId,
    name: us.name,
    side,
    slot,
    tier: us.tier ?? (side === 'party' ? 'hero' : 'mob'),
    affinity: us.affinity,
    stats,
    hp: Math.max(1, Math.round(stats.hp * (us.hpPct ?? 1))),
    maxHp: stats.hp,
    shell: maxShell,
    maxShell,
    weaknesses: [...(us.weaknesses ?? [])],
    resists: [...(us.resists ?? [])],
    broken: false,
    gauge: clamp(startGauge, 0, GAUGE_MAX),
    mods: [],
    guarding: false,
    nextAt: INTERVAL / Math.max(1, stats.spd),
    alive: true,
    kit: us.kit ?? null,
    foeKit: us.foeKit ?? [],
    ai: us.ai ?? null,
    aiIndex: 0,
    intent: null,
    passives,
  };
}

function emptyStats(): BattleStats {
  return {
    turns: 0,
    breaks: 0,
    weakHits: 0,
    encores: 0,
    passes: 0,
    bursts: 0,
    ultimates: 0,
    crits: 0,
    kos: 0,
    damageDealt: 0,
    damageTaken: 0,
    healed: 0,
  };
}

function buildState(setup: BattleSetup, seed: string | number): BattleState {
  if (setup.party.length === 0) throw new Error('A battle needs at least one party member');
  if (setup.foes.length === 0) throw new Error('A battle needs at least one foe');
  const shared = setup.partyPassives ?? [];
  const units: Unit[] = [];
  setup.party.forEach((u, i) => units.push(makeUnit(u, 'party', i, shared)));
  setup.foes.forEach((u, i) => units.push(makeUnit(u, 'foe', i, [])));
  const ids = new Set(units.map((u) => u.id));
  if (ids.size !== units.length) throw new Error('Unit ids must be unique within a battle');

  let lantern = setup.startLantern ?? LANTERN_START;
  lantern += sumPassives(shared, 'startLantern');
  for (const u of setup.party) lantern += sumPassives(u.passives ?? [], 'startLantern');

  return {
    seed,
    rng: seedRng(seed),
    now: 0,
    turnCount: 0,
    units,
    lantern: clamp(Math.round(lantern), 0, LANTERN_MAX),
    awaiting: { type: 'over' },
    chain: null,
    turnOwner: null,
    result: null,
    stats: emptyStats(),
  };
}

// ---------------------------------------------------------------------------
// Targeting and small state changes
// ---------------------------------------------------------------------------

export function resolveTargets(
  s: BattleState,
  actor: Unit,
  skill: SkillDef,
  targetId: string | null | undefined,
): Unit[] {
  const foes = opposing(s, actor);
  const allies = living(s, actor.side);
  switch (skill.target) {
    case 'allEnemies':
      return foes;
    case 'allAllies':
      return allies;
    case 'self':
      return actor.alive ? [actor] : [];
    case 'enemy': {
      if (actor.side === 'foe') {
        const t = foes.find(hasTaunt) ?? foes.find((x) => x.id === targetId) ?? chooseFoeTarget(s, actor);
        return t ? [t] : [];
      }
      const t = foes.find((x) => x.id === targetId) ?? foes[0];
      return t ? [t] : [];
    }
    case 'ally': {
      const t = allies.find((x) => x.id === targetId) ?? lowestHpFrac(allies);
      return t ? [t] : [];
    }
  }
}

/** Units an effect lands on. */
export function scopeUnits(s: BattleState, actor: Unit, targets: Unit[], on: EffectScope): Unit[] {
  switch (on) {
    case 'targets':
      return targets.filter((t) => t.alive);
    case 'self':
      return actor.alive ? [actor] : [];
    case 'party':
      return living(s, actor.side);
    case 'foes':
      return opposing(s, actor);
  }
}

function setLantern(s: BattleState, value: number, ev: BattleEvent[]): void {
  const next = clamp(value, 0, LANTERN_MAX);
  if (next === s.lantern) return;
  s.lantern = next;
  ev.push({ t: 'lantern', value: next });
}

function gainGauge(u: Unit, amount: number, ev: BattleEvent[]): void {
  if (u.side !== 'party' || amount <= 0 || !u.alive) return;
  const before = u.gauge;
  u.gauge = Math.min(GAUGE_MAX, u.gauge + amount * (1 + passive(u, 'gaugeGain')));
  if (u.gauge !== before) ev.push({ t: 'gauge', unit: u.id, value: u.gauge });
}

function addMod(
  s: BattleState,
  target: Unit,
  key: string,
  stat: ModStat | 'taunt',
  pct: number,
  turns: number,
  ev: BattleEvent[],
): void {
  const fresh = s.turnOwner === target.id;
  const existing = target.mods.find((m) => m.key === key);
  if (existing) {
    existing.pct = pct;
    existing.turns = turns;
    existing.fresh = fresh;
  } else {
    target.mods.push({ key, stat, pct, turns, fresh });
  }
  ev.push({ t: 'mod', target: target.id, stat, pct, turns });
}

function endTurnMods(u: Unit): void {
  for (const m of u.mods) {
    if (m.fresh) m.fresh = false;
    else m.turns--;
  }
  u.mods = u.mods.filter((m) => m.turns > 0);
}

function heal(s: BattleState, actor: Unit, target: Unit, amount: number, ev: BattleEvent[]): void {
  if (!target.alive) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const gained = target.hp - before;
  if (gained <= 0) return;
  if (target.side === 'party') s.stats.healed += gained;
  ev.push({ t: 'heal', actor: actor.id, target: target.id, amount: gained, hp: target.hp });
}

// ---------------------------------------------------------------------------
// Hits, Break, effects, skills
// ---------------------------------------------------------------------------

interface HitResult {
  weakStanding: boolean;
  broke: boolean;
}

function breakUnit(s: BattleState, actor: Unit, target: Unit, ev: BattleEvent[]): void {
  target.broken = true;
  target.nextAt += BREAK_DELAY * cycleOf(target);
  target.intent = null;
  if (actor.side === 'party') s.stats.breaks++;
  ev.push({ t: 'break', unit: target.id });
  gainGauge(actor, GAUGE_ON_BREAK, ev);
  const healFrac = passive(actor, 'breakHeal');
  if (healFrac > 0) for (const ally of living(s, actor.side)) heal(s, actor, ally, Math.round(ally.maxHp * healFrac), ev);
}

function hit(
  s: BattleState,
  actor: Unit,
  target: Unit,
  skill: SkillDef,
  power: number,
  bonus: number,
  ev: BattleEvent[],
  isBurst: boolean,
): HitResult {
  const crit = rngNext(s.rng) < CRIT_CHANCE;
  const variance = 0.96 + rngNext(s.rng) * 0.08;
  const guardMult = target.guarding ? Math.max(0.2, GUARD_MULT - passive(target, 'guardPower')) : 1;
  const roll = damageAmount(actor, target, skill.affinity, power, bonus, guardMult, crit, variance);

  const dealt = Math.min(roll.amount, target.hp);
  target.hp -= dealt;
  if (actor.side === 'party') {
    s.stats.damageDealt += dealt;
    if (crit) s.stats.crits++;
  } else {
    s.stats.damageTaken += dealt;
  }

  const standing = !target.broken;
  const weakStanding = roll.weak && standing && !isBurst;
  let broke = false;
  if (target.hp > 0 && weakStanding && target.maxShell > 0) {
    target.shell = Math.max(0, target.shell - (skill.shell + passive(actor, 'shellBonus')));
    broke = target.shell === 0;
  }

  ev.push({
    t: 'hit',
    actor: actor.id,
    target: target.id,
    amount: roll.amount,
    hp: target.hp,
    shell: target.shell,
    crit,
    weak: roll.weak,
    resist: roll.resist,
    broke,
  });

  if (weakStanding && actor.side === 'party') s.stats.weakHits++;
  if (roll.weak) gainGauge(actor, GAUGE_ON_WEAK, ev);
  if (target.side === 'party') gainGauge(target, GAUGE_ON_HIT_BASE + (GAUGE_ON_HIT_SCALE * dealt) / target.maxHp, ev);

  if (target.hp <= 0) {
    target.alive = false;
    target.hp = 0;
    target.intent = null;
    s.stats.kos++;
    ev.push({ t: 'ko', unit: target.id });
  } else if (broke) {
    breakUnit(s, actor, target, ev);
  }
  return { weakStanding, broke };
}

function applyEffects(s: BattleState, actor: Unit, skill: SkillDef, targets: Unit[], ev: BattleEvent[]): void {
  for (const e of skill.effects ?? []) {
    switch (e.type) {
      case 'mod':
        for (const t of scopeUnits(s, actor, targets, e.on)) addMod(s, t, `${skill.id}:${e.stat}`, e.stat, e.pct, e.turns, ev);
        break;
      case 'taunt':
        addMod(s, actor, `${skill.id}:taunt`, 'taunt', 0, e.turns, ev);
        break;
      case 'heal':
        for (const t of scopeUnits(s, actor, targets, e.on)) {
          const base = e.of === 'atk' ? e.scale * effStat(actor, 'atk') : e.scale * t.maxHp;
          heal(s, actor, t, Math.round(base * (1 + passive(actor, 'healPower'))), ev);
        }
        break;
      case 'delay':
        for (const t of scopeUnits(s, actor, targets, e.on)) {
          t.nextAt += e.pct * cycleOf(t);
          ev.push({ t: 'delay', target: t.id, pct: e.pct });
        }
        break;
      case 'advance':
        for (const t of scopeUnits(s, actor, targets, e.on)) {
          t.nextAt = Math.max(s.now, t.nextAt - e.pct * cycleOf(t));
          ev.push({ t: 'advance', target: t.id, pct: e.pct });
        }
        break;
      case 'gauge':
        for (const t of scopeUnits(s, actor, targets, e.on)) gainGauge(t, e.amount, ev);
        break;
    }
  }
}

/** Returns true when the action hit a standing enemy's weakness, which earns an Encore. */
function resolveSkill(
  s: BattleState,
  actor: Unit,
  skill: SkillDef,
  targetId: string | null | undefined,
  bonus: number,
  ev: BattleEvent[],
): boolean {
  const targets = resolveTargets(s, actor, skill, targetId);
  ev.push({
    t: 'act',
    actor: actor.id,
    skill: skill.id,
    name: skill.name,
    kind: skill.kind,
    targets: targets.map((t) => t.id),
    affinity: skill.affinity,
  });
  if (actor.side === 'party' && skill.lantern !== 0) setLantern(s, s.lantern + skill.lantern, ev);

  let earned = false;
  if (skill.power > 0) {
    for (const t of targets) {
      if (!t.alive) continue;
      if (hit(s, actor, t, skill, skill.power, bonus, ev, false).weakStanding) earned = true;
    }
  }
  applyEffects(s, actor, skill, targets, ev);
  gainGauge(actor, skill.gauge, ev);
  return earned;
}

// ---------------------------------------------------------------------------
// Special actions
// ---------------------------------------------------------------------------

export function burstLegal(s: BattleState): boolean {
  const foes = living(s, 'foe');
  return foes.length > 0 && living(s, 'party').length > 0 && foes.every((f) => f.broken);
}

function doBurst(s: BattleState, actor: Unit, ev: BattleEvent[]): void {
  ev.push({ t: 'burst', actor: actor.id });
  s.stats.bursts++;
  for (const member of living(s, 'party')) {
    const basic = member.kit!.basic;
    const bonus = 1 + passive(member, 'burstDamage');
    for (const foe of living(s, 'foe')) hit(s, member, foe, basic, BURST_POWER, bonus, ev, true);
    gainGauge(member, BURST_GAUGE, ev);
  }
  // The Break is spent: survivors stand back up and act normally.
  for (const foe of living(s, 'foe')) {
    foe.broken = false;
    foe.shell = foe.maxShell;
    ev.push({ t: 'recover', unit: foe.id, shell: foe.shell });
    pickIntent(s, foe, ev);
  }
}

function doGuard(s: BattleState, actor: Unit, ev: BattleEvent[]): void {
  actor.guarding = true;
  ev.push({ t: 'act', actor: actor.id, skill: 'guard', name: 'Guard', kind: 'guard', targets: [actor.id], affinity: null });
  setLantern(s, s.lantern + 1, ev);
  gainGauge(actor, GUARD_GAUGE, ev);
}

function fireUltimate(s: BattleState, unit: Unit, target: string | undefined, ev: BattleEvent[]): void {
  const skill = unit.kit!.ultimate;
  unit.gauge = 0;
  s.stats.ultimates++;
  ev.push({ t: 'ult', unit: unit.id, name: skill.name });
  ev.push({ t: 'gauge', unit: unit.id, value: 0 });
  resolveSkill(s, unit, skill, target, 1, ev);
}

/** Damage multiplier for the acting unit's current slot in the chain. */
export function chainBonus(s: BattleState, actor: Unit): number {
  const chain = s.chain;
  if (!chain) return 1;
  let bonus = 1 + Math.min(PASS_BONUS_CAP, PASS_BONUS * chain.passCount);
  if (chain.slotActions > 0 || chain.passCount > 0) bonus *= 1 + passive(actor, 'encoreDamage');
  return bonus;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function pickNext(s: BattleState): Unit | undefined {
  let best: Unit | undefined;
  for (const u of s.units) {
    if (!u.alive) continue;
    if (!best || u.nextAt < best.nextAt || (u.nextAt === best.nextAt && u.side === 'party' && best.side === 'foe')) best = u;
  }
  return best;
}

function checkEnd(s: BattleState, ev: BattleEvent[]): boolean {
  if (s.result) return true;
  if (living(s, 'foe').length === 0) s.result = 'victory';
  else if (living(s, 'party').length === 0) s.result = 'defeat';
  if (!s.result) return false;
  s.awaiting = { type: 'over' };
  s.chain = null;
  s.turnOwner = null;
  ev.push({ t: 'end', result: s.result });
  return true;
}

function runFoeTurn(s: BattleState, foe: Unit, ev: BattleEvent[]): void {
  s.turnOwner = foe.id;
  ev.push({ t: 'foeTurn', unit: foe.id });

  if (foe.broken) {
    ev.push({ t: 'skip', unit: foe.id, reason: 'broken' });
    foe.broken = false;
    foe.shell = foe.maxShell;
    ev.push({ t: 'recover', unit: foe.id, shell: foe.shell });
    foe.nextAt = s.now + cycleOf(foe);
    endTurnMods(foe);
    pickIntent(s, foe, ev);
    s.turnCount++;
    s.turnOwner = null;
    return;
  }

  if (!foe.intent) pickIntent(s, foe, ev);
  const intent = foe.intent;
  const skill = foe.foeKit.find((k) => k.id === intent?.skill) ?? foe.foeKit[0];
  if (skill) resolveSkill(s, foe, skill, intent?.target ?? null, 1, ev);
  if (checkEnd(s, ev)) return;

  foe.nextAt = s.now + cycleOf(foe) * (skill?.timeCost ?? 1);
  endTurnMods(foe);
  pickIntent(s, foe, ev);
  s.turnCount++;
  s.turnOwner = null;
}

/** Run foe turns until a party member needs to act, or the battle ends. */
function advance(s: BattleState, ev: BattleEvent[]): void {
  while (!s.result) {
    if (s.turnCount >= MAX_TURNS) {
      s.result = 'defeat';
      s.awaiting = { type: 'over' };
      s.chain = null;
      ev.push({ t: 'end', result: 'defeat', reason: 'timeout' });
      return;
    }
    const u = pickNext(s);
    if (!u) return;
    s.now = Math.max(s.now, u.nextAt);
    if (u.side === 'foe') {
      runFoeTurn(s, u, ev);
      continue;
    }
    u.guarding = false;
    s.turnOwner = u.id;
    s.chain = { originator: u.id, current: u.id, used: [u.id], passCount: 0, slotActions: 0, encoreUsed: false, lastTimeCost: 1 };
    s.awaiting = { type: 'input', actor: u.id, mode: 'turn' };
    ev.push({ t: 'turn', unit: u.id, mode: 'turn' });
    return;
  }
}

function endChain(s: BattleState, ev: BattleEvent[]): void {
  const chain = s.chain;
  if (!chain) return;
  const origin = getUnit(s, chain.originator);
  if (origin.alive) {
    origin.nextAt = s.now + cycleOf(origin) * chain.lastTimeCost;
    endTurnMods(origin);
  }
  s.turnCount++;
  s.stats.turns++;
  s.chain = null;
  s.turnOwner = null;
  advance(s, ev);
}

// ---------------------------------------------------------------------------
// Legal actions and submit
// ---------------------------------------------------------------------------

function targetVariants(s: BattleState, which: 'basic' | 'skill', skill: SkillDef): Action[] {
  if (skill.target === 'enemy') return living(s, 'foe').map((f) => ({ type: 'skill', skill: which, target: f.id }));
  if (skill.target === 'ally') return living(s, 'party').map((a) => ({ type: 'skill', skill: which, target: a.id }));
  return [{ type: 'skill', skill: which }];
}

/** Basic and skill actions a party unit could take right now, respecting the Lantern pool. */
export function skillActionsFor(s: BattleState, u: Unit): Action[] {
  const kit = u.kit;
  if (!kit) return [];
  const out: Action[] = [];
  for (const which of ['basic', 'skill'] as const) {
    const skill = kit[which];
    if (skill.lantern < 0 && s.lantern < -skill.lantern) continue;
    out.push(...targetVariants(s, which, skill));
  }
  return out;
}

function ultimateActionsFor(s: BattleState, u: Unit): Action[] {
  const skill = u.kit!.ultimate;
  if (skill.target === 'enemy') return living(s, 'foe').map((f) => ({ type: 'ultimate', unit: u.id, target: f.id }));
  if (skill.target === 'ally') return living(s, 'party').map((a) => ({ type: 'ultimate', unit: u.id, target: a.id }));
  return [{ type: 'ultimate', unit: u.id }];
}

export function legalActions(s: BattleState): Action[] {
  const aw = s.awaiting;
  if (aw.type !== 'input') return [];
  const actor = getUnit(s, aw.actor);
  const out: Action[] = [...skillActionsFor(s, actor), { type: 'guard' }];
  for (const u of living(s, 'party')) if (u.gauge >= GAUGE_MAX && u.kit) out.push(...ultimateActionsFor(s, u));
  if (burstLegal(s)) out.push({ type: 'burst' });
  if (aw.mode === 'encore' && s.chain) {
    for (const ally of living(s, 'party')) if (!s.chain.used.includes(ally.id)) out.push({ type: 'pass', to: ally.id });
  }
  return out;
}

export function actionKey(a: Action): string {
  switch (a.type) {
    case 'skill':
      return `skill:${a.skill}:${a.target ?? ''}`;
    case 'ultimate':
      return `ultimate:${a.unit}:${a.target ?? ''}`;
    case 'pass':
      return `pass:${a.to}`;
    default:
      return a.type;
  }
}

export function submit(s: BattleState, action: Action): BattleEvent[] {
  const ev: BattleEvent[] = [];
  const aw = s.awaiting;
  if (aw.type !== 'input' || !s.chain) throw new Error('No input expected: the battle is over');
  const key = actionKey(action);
  if (!legalActions(s).some((a) => actionKey(a) === key)) throw new Error(`Illegal action: ${key}`);
  const chain = s.chain;
  const actor = getUnit(s, aw.actor);

  // Ultimates are interrupts: they do not use the current action and cannot earn an Encore.
  if (action.type === 'ultimate') {
    fireUltimate(s, getUnit(s, action.unit), action.target, ev);
    checkEnd(s, ev);
    return ev;
  }

  if (action.type === 'pass') {
    chain.current = action.to;
    chain.used.push(action.to);
    chain.passCount++;
    chain.slotActions = 0;
    chain.encoreUsed = false;
    s.stats.passes++;
    ev.push({ t: 'pass', from: actor.id, to: action.to, count: chain.passCount });
    s.awaiting = { type: 'input', actor: action.to, mode: 'passed' };
    ev.push({ t: 'turn', unit: action.to, mode: 'passed' });
    return ev;
  }

  if (aw.mode === 'encore') chain.encoreUsed = true;
  const bonus = chainBonus(s, actor);
  let earned = false;
  let timeCost = 1;
  switch (action.type) {
    case 'guard':
      doGuard(s, actor, ev);
      timeCost = GUARD_TIME_COST;
      break;
    case 'burst':
      doBurst(s, actor, ev);
      break;
    case 'skill': {
      const skill = actor.kit![action.skill];
      earned = resolveSkill(s, actor, skill, action.target, bonus, ev);
      timeCost = skill.timeCost ?? 1;
      break;
    }
  }
  chain.slotActions++;
  if (chain.current === chain.originator) chain.lastTimeCost = timeCost;
  if (checkEnd(s, ev)) return ev;

  if (earned && !chain.encoreUsed) {
    s.awaiting = { type: 'input', actor: actor.id, mode: 'encore' };
    s.stats.encores++;
    ev.push({ t: 'encore', unit: actor.id });
    return ev;
  }
  endChain(s, ev);
  return ev;
}

// ---------------------------------------------------------------------------
// Public wrapper
// ---------------------------------------------------------------------------

export class Battle {
  readonly state: BattleState;
  /** Events produced while setting up, such as the first enemy intents. */
  readonly initialEvents: BattleEvent[];

  private constructor(state: BattleState, initialEvents: BattleEvent[]) {
    this.state = state;
    this.initialEvents = initialEvents;
  }

  static create(setup: BattleSetup, seed: string | number): Battle {
    const state = buildState(setup, seed);
    const ev: BattleEvent[] = [];
    for (const u of state.units) if (u.side === 'foe') pickIntent(state, u, ev);
    advance(state, ev);
    return new Battle(state, ev);
  }

  clone(): Battle {
    return new Battle(structuredClone(this.state), []);
  }

  get over(): boolean {
    return this.state.awaiting.type === 'over';
  }

  get result(): BattleState['result'] {
    return this.state.result;
  }

  legalActions(): Action[] {
    return legalActions(this.state);
  }

  submit(action: Action): BattleEvent[] {
    return submit(this.state, action);
  }
}
