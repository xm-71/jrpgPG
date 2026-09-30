import { rngShuffle, rngWeighted, seedRng } from '../rng';
import {
  cardStats,
  hasKeyword,
  passiveSum,
  type BattleSetup,
  type CardAction,
  type CardDef,
  type CardEffect,
  type CardInstance,
  type CardStats,
  type FoeMove,
  type FoeSetup,
  type StatusId,
} from './defs';
import {
  ASH_ID,
  BREAK_DRAW,
  BROKEN_MULT,
  CHAIN_MAX_STEPS,
  CHAIN_STEP,
  CHILL_MULT,
  GAUGE_MAX,
  GAUGE_PER_BREAK,
  GAUGE_PER_CARD,
  HEX_MULT,
  LATE_TURN,
  MAX_FOES,
  RESIST_MULT,
  WEAK_MULT,
} from './rules';
import { HERO, type CardBattleState, type CardEvent, type FoeState, type HeroState, type Statuses } from './state';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export const living = (s: CardBattleState): FoeState[] => s.foes.filter((f) => f.alive);

export function statsOf(s: CardBattleState, c: CardInstance): CardStats {
  const def = s.cards[c.id];
  if (!def) throw new Error(`Unknown card: ${c.id}`);
  return cardStats(def, c.up);
}

export function defOf(s: CardBattleState, c: CardInstance): CardDef {
  const def = s.cards[c.id];
  if (!def) throw new Error(`Unknown card: ${c.id}`);
  return def;
}

export const maxLight = (s: CardBattleState): number => Math.max(1, s.hero.maxLight + passiveSum(s.hero.passives, 'maxLight'));
export const handLimit = (s: CardBattleState): number => Math.max(1, s.hero.handLimit + passiveSum(s.hero.passives, 'handLimit'));

function setStatus(unit: { statuses: Statuses }, id: string, status: StatusId, stacks: number, ev: CardEvent[]): void {
  const v = Math.max(0, Math.round(stacks));
  if (v === 0) delete unit.statuses[status];
  else unit.statuses[status] = v;
  ev.push({ t: 'status', unit: id, status, stacks: v });
}

function addStatus(unit: { statuses: Statuses }, id: string, status: StatusId, stacks: number, ev: CardEvent[]): void {
  setStatus(unit, id, status, (unit.statuses[status] ?? 0) + stacks, ev);
}

function tick(unit: { statuses: Statuses }, id: string, status: StatusId, ev: CardEvent[]): void {
  const v = unit.statuses[status] ?? 0;
  if (v > 0) setStatus(unit, id, status, v - 1, ev);
}

function newStats(): CardBattleState['stats'] {
  return {
    turns: 0,
    cardsPlayed: 0,
    damageDealt: 0,
    damageTaken: 0,
    blocked: 0,
    heldWard: 0,
    held: 0,
    breaks: 0,
    kos: 0,
    maxChain: 0,
    chains: 0,
    ultimates: 0,
    healed: 0,
    plays: {},
    kinds: {},
  };
}

function foeState(f: FoeSetup, id: string, slot: number): FoeState {
  if (f.moves.length === 0) throw new Error(`Foe ${f.defId} has no moves`);
  return {
    id,
    defId: f.defId,
    name: f.name,
    family: f.family,
    tier: f.tier,
    slot,
    hp: Math.max(1, Math.round(f.hp)),
    maxHp: Math.max(1, Math.round(f.hp)),
    ward: 0,
    shell: f.shell,
    maxShell: f.shell,
    weaknesses: [...f.weaknesses],
    resists: [...f.resists],
    broken: false,
    hardened: false,
    alive: true,
    statuses: {},
    moves: f.moves,
    pattern: f.pattern ? [...f.pattern] : null,
    weights: f.weights ? { ...f.weights } : null,
    aiIndex: 0,
    opener: f.opener ?? null,
    intent: null,
    power: f.power,
  };
}

/** Copy a state for look-ahead. The card and summon tables are shared, since nothing changes them. */
export function cloneState(s: CardBattleState): CardBattleState {
  const { cards, summons, ...rest } = s;
  return { ...structuredClone(rest), cards, summons };
}

// ---------------------------------------------------------------------------
// Setup and turns
// ---------------------------------------------------------------------------

export function createBattle(setup: BattleSetup, seed: string): { state: CardBattleState; events: CardEvent[] } {
  if (setup.foes.length === 0) throw new Error('A fight needs at least one foe');
  const h = setup.hero;
  const hero: HeroState = {
    id: h.id,
    name: h.name,
    affinity: h.affinity,
    hp: Math.max(1, Math.min(h.maxHp, Math.round(h.hp))),
    maxHp: h.maxHp,
    ward: 0,
    gauge: 0,
    statuses: {},
    maxLight: h.maxLight,
    handLimit: h.handLimit,
    ultimate: h.ultimate,
    ultimateUp: h.ultimateUp === true,
    passives: [...h.passives],
  };
  const deck = setup.deck.map((c) => ({ ...c }));
  for (const c of deck) if (!setup.cards[c.id]) throw new Error(`Deck card ${c.id} is missing from the card table`);
  const rng = seedRng(seed);
  const s: CardBattleState = {
    seed,
    rng,
    turn: 0,
    hero,
    foes: setup.foes.map((f, i) => foeState(f, `f${i}:${f.defId}`, i)),
    light: 0,
    draw: rngShuffle(rng, deck),
    hand: [],
    discard: [],
    spent: [],
    cards: setup.cards,
    summons: setup.summons ?? {},
    chain: { affinity: null, steps: 0 },
    playedThisTurn: 0,
    heldWards: [],
    nextUid: deck.reduce((m, c) => Math.max(m, c.uid), 0) + 1,
    summoned: 0,
    over: false,
    result: null,
    stats: newStats(),
  };
  const ev: CardEvent[] = [];
  for (const p of hero.passives) {
    if (p.type === 'startStatus') for (const f of s.foes) addStatus(f, f.id, p.status, p.stacks, ev);
  }
  hero.gauge = Math.min(GAUGE_MAX - 1, Math.max(0, passiveSum(hero.passives, 'startGauge')));
  hero.ward = Math.max(0, passiveSum(hero.passives, 'startWard'));
  for (const f of s.foes) pickIntent(s, f, ev);
  startTurn(s, ev);
  return { state: s, events: ev };
}

function drawCards(s: CardBattleState, n: number, ev: CardEvent[]): void {
  const drawn: number[] = [];
  for (let i = 0; i < n; i++) {
    if (s.draw.length === 0) {
      if (s.discard.length === 0) break;
      s.draw = rngShuffle(s.rng, s.discard);
      s.discard = [];
      ev.push({ t: 'shuffle', count: s.draw.length });
    }
    const c = s.draw.pop()!;
    s.hand.push(c);
    drawn.push(c.uid);
  }
  if (drawn.length) ev.push({ t: 'draw', uids: drawn });
}

function startTurn(s: CardBattleState, ev: CardEvent[]): void {
  s.turn++;
  s.stats.turns = s.turn;
  const hero = s.hero;
  tick(hero, HERO, 'hex', ev);
  if (s.turn > 1 && hero.ward > 0) {
    hero.ward = 0;
    ev.push({ t: 'ward', unit: HERO, value: 0 });
  }
  const dim = hero.statuses.dim ?? 0;
  if (dim > 0) setStatus(hero, HERO, 'dim', 0, ev);
  const opening = s.turn === 1 ? passiveSum(hero.passives, 'openingLight') : 0;
  s.light = Math.max(0, maxLight(s) + opening - dim);
  s.chain = { affinity: null, steps: 0 };
  s.playedThisTurn = 0;
  s.heldWards = [];
  const extra = s.turn === 1 ? passiveSum(hero.passives, 'openingDraw') : 0;
  ev.push({ t: 'turn', turn: s.turn, light: s.light });
  drawCards(s, handLimit(s) + extra - s.hand.length, ev);
}

// ---------------------------------------------------------------------------
// Playing cards
// ---------------------------------------------------------------------------

function chainMult(s: CardBattleState): number {
  const steps = Math.min(CHAIN_MAX_STEPS, s.chain.steps);
  return 1 + steps * (CHAIN_STEP + passiveSum(s.hero.passives, 'chainBonus'));
}

function damagePct(s: CardBattleState, def: CardDef): number {
  let pct = passiveSum(s.hero.passives, 'damage');
  for (const p of s.hero.passives) if (p.type === 'affinityDamage' && p.affinity === def.affinity) pct += p.pct;
  return pct;
}

/** Damage one hit of a card would do to a foe right now, before its ward. */
export function hitAmount(s: CardBattleState, f: FoeState, def: CardDef, base: number): { amount: number; weak: boolean; resist: boolean } {
  const weak = def.affinity !== null && f.weaknesses.includes(def.affinity);
  const resist = def.affinity !== null && f.resists.includes(def.affinity);
  let mult = chainMult(s) * (1 + damagePct(s, def));
  if (weak) mult *= WEAK_MULT;
  if (resist) mult *= RESIST_MULT;
  if (f.broken) mult *= BROKEN_MULT;
  if (f.statuses.hex) mult *= HEX_MULT;
  if (s.hero.statuses.chill) mult *= CHILL_MULT;
  const flat = base + (s.hero.statuses.rage ?? 0);
  return { amount: Math.max(0, Math.round(flat * mult)), weak, resist };
}

function strike(s: CardBattleState, f: FoeState, def: CardDef, st: CardStats, base: number, ev: CardEvent[]): void {
  const hit = hitAmount(s, f, def, base);
  let amount = hit.amount;
  const shock = f.statuses.shock ?? 0;
  if (shock > 0) {
    amount += shock;
    setStatus(f, f.id, 'shock', 0, ev);
  }
  const blocked = hasKeyword(st, 'pierce') ? 0 : Math.min(f.ward, amount);
  f.ward -= blocked;
  const dealt = amount - blocked;
  f.hp = Math.max(0, f.hp - dealt);
  s.stats.damageDealt += dealt;
  let broke = false;
  if (hit.weak && !hit.resist && f.maxShell > 0 && !f.broken && !f.hardened) {
    f.shell = Math.max(0, f.shell - 1 - passiveSum(s.hero.passives, 'shellBonus'));
    broke = f.shell === 0;
  }
  ev.push({ t: 'hit', target: f.id, amount, blocked, hp: f.hp, ward: f.ward, shell: f.shell, weak: hit.weak, resist: hit.resist });
  if (f.hp <= 0) ko(s, f, ev);
  else if (broke) breakFoe(s, f, ev);
}

function ko(s: CardBattleState, f: FoeState, ev: CardEvent[]): void {
  f.alive = false;
  f.hp = 0;
  f.intent = null;
  f.ward = 0;
  f.statuses = {};
  s.stats.kos++;
  ev.push({ t: 'ko', unit: f.id });
}

function breakFoe(s: CardBattleState, f: FoeState, ev: CardEvent[]): void {
  f.broken = true;
  f.shell = 0;
  f.intent = null;
  s.stats.breaks++;
  ev.push({ t: 'break', unit: f.id });
  ev.push({ t: 'intent', unit: f.id, move: null });
  // The Break pays you back: full Light, a fresh card and a surge of the gauge.
  s.light = Math.max(s.light, maxLight(s));
  ev.push({ t: 'light', value: s.light });
  drawCards(s, BREAK_DRAW + passiveSum(s.hero.passives, 'breakDraw'), ev);
  const heal = passiveSum(s.hero.passives, 'breakHeal');
  if (heal > 0) healHero(s, heal, ev);
  const ward = passiveSum(s.hero.passives, 'breakWard');
  if (ward > 0) {
    s.hero.ward += ward;
    ev.push({ t: 'ward', unit: HERO, value: s.hero.ward });
  }
  addGauge(s, GAUGE_PER_BREAK, ev);
}

function healHero(s: CardBattleState, amount: number, ev: CardEvent[]): void {
  const h = s.hero;
  const amt = Math.max(0, Math.min(h.maxHp - h.hp, Math.round(amount * (1 + passiveSum(h.passives, 'healPower')))));
  h.hp += amt;
  s.stats.healed += amt;
  ev.push({ t: 'heal', unit: HERO, amount: amt, hp: h.hp });
}

function addGauge(s: CardBattleState, amount: number, ev: CardEvent[]): void {
  const h = s.hero;
  if (!h.ultimate || s.over || !s.cards[h.ultimate]) return;
  h.gauge += Math.round(amount * (1 + passiveSum(h.passives, 'gaugeGain')));
  if (h.gauge >= GAUGE_MAX) {
    h.gauge = 0;
    const c: CardInstance = { uid: s.nextUid++, id: h.ultimate, ...(h.ultimateUp ? { up: true } : {}) };
    s.hand.push(c);
    ev.push({ t: 'ultimate', uid: c.uid, id: c.id });
  }
  ev.push({ t: 'gauge', value: h.gauge });
}

function crack(s: CardBattleState, f: FoeState, amount: number, ev: CardEvent[]): void {
  if (!f.alive || f.broken || f.hardened || f.maxShell === 0) return;
  f.shell = Math.max(0, f.shell - amount);
  ev.push({ t: 'crack', unit: f.id, shell: f.shell });
  if (f.shell === 0) breakFoe(s, f, ev);
}

function applyEffect(s: CardBattleState, e: CardEffect, def: CardDef, target: FoeState | null, ev: CardEvent[]): void {
  switch (e.type) {
    case 'status': {
      const on = e.on ?? (def.target === 'self' ? 'self' : def.target === 'allFoes' ? 'allFoes' : 'target');
      const stacks = e.stacks + (e.status === 'burn' ? passiveSum(s.hero.passives, 'burnPower') : 0);
      if (on === 'self') addStatus(s.hero, HERO, e.status, stacks, ev);
      else for (const f of on === 'allFoes' ? living(s) : target && target.alive ? [target] : []) addStatus(f, f.id, e.status, stacks, ev);
      break;
    }
    case 'heal':
      healHero(s, e.amount, ev);
      break;
    case 'draw':
      drawCards(s, e.count, ev);
      break;
    case 'light':
      s.light += e.amount;
      ev.push({ t: 'light', value: s.light });
      break;
    case 'ward':
      s.hero.ward += e.amount;
      ev.push({ t: 'ward', unit: HERO, value: s.hero.ward });
      break;
    case 'crack':
      for (const f of def.target === 'allFoes' ? living(s) : target ? [target] : []) crack(s, f, e.amount, ev);
      break;
    case 'gauge':
      addGauge(s, e.amount, ev);
      break;
    case 'cleanse':
      for (const st of ['chill', 'hex', 'dim', 'burn'] as const) if (s.hero.statuses[st]) setStatus(s.hero, HERO, st, 0, ev);
      break;
  }
}

function checkEnd(s: CardBattleState, ev: CardEvent[]): void {
  if (s.over) return;
  if (s.hero.hp <= 0) {
    s.over = true;
    s.result = 'defeat';
    ev.push({ t: 'end', result: 'defeat' });
  } else if (s.foes.every((f) => !f.alive)) {
    s.over = true;
    s.result = 'victory';
    ev.push({ t: 'end', result: 'victory' });
  }
}

/** Can this card be played right now? */
export function playable(s: CardBattleState, c: CardInstance): boolean {
  if (s.over) return false;
  const st = statsOf(s, c);
  return !hasKeyword(st, 'unplayable') && st.cost <= s.light;
}

function play(s: CardBattleState, uid: number, targetId: string | undefined, ev: CardEvent[]): void {
  const idx = s.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) throw new Error(`Card ${uid} is not in hand`);
  const inst = s.hand[idx]!;
  const def = defOf(s, inst);
  const st = cardStats(def, inst.up);
  if (!playable(s, inst)) throw new Error(`${def.name} cannot be played now`);
  let target: FoeState | null = null;
  if (def.target === 'foe') {
    const alive = living(s);
    target = targetId ? (alive.find((f) => f.id === targetId) ?? null) : alive.length === 1 ? alive[0]! : null;
    if (!target) throw new Error(`${def.name} needs a living target`);
  }

  s.hand.splice(idx, 1);
  s.light -= st.cost;

  // Chain: cards of one affinity in a row hit harder. Linked cards continue any Chain.
  if (hasKeyword(st, 'linked')) {
    if (s.playedThisTurn > 0) s.chain.steps++;
  } else if (def.affinity !== null && def.affinity === s.chain.affinity) {
    s.chain.steps++;
  } else {
    s.chain = { affinity: def.affinity, steps: 0 };
  }
  if (s.chain.steps > 0) {
    s.stats.maxChain = Math.max(s.stats.maxChain, s.chain.steps + 1);
    if (s.chain.steps === 1) s.stats.chains++;
    ev.push({ t: 'chain', steps: s.chain.steps, affinity: s.chain.affinity });
  }
  const first = s.playedThisTurn === 0;
  s.playedThisTurn++;
  s.stats.cardsPlayed++;
  const key = def.affinity ?? 'none';
  s.stats.plays[key] = (s.stats.plays[key] ?? 0) + 1;
  s.stats.kinds[def.kind] = (s.stats.kinds[def.kind] ?? 0) + 1;
  if (def.source === 'ultimate') s.stats.ultimates++;

  const to = def.source === 'ultimate' || hasKeyword(st, 'spent') ? 'spent' : 'discard';
  ev.push({ t: 'play', uid, id: def.id, target: target?.id ?? null, light: s.light, to });

  if (st.atk > 0 && def.target !== 'self') {
    const base = st.atk + (first ? passiveSum(s.hero.passives, 'firstStrike') : 0);
    for (let h = 0; h < st.hits; h++) {
      const targets = def.target === 'allFoes' ? living(s) : target && target.alive ? [target] : [];
      for (const f of targets) strike(s, f, def, st, base, ev);
    }
  }
  for (const e of st.effects) {
    if (s.over) break;
    applyEffect(s, e, def, target, ev);
  }
  if (to === 'spent') s.spent.push(inst);
  else s.discard.push(inst);
  checkEnd(s, ev);
  if (def.source !== 'ultimate') addGauge(s, GAUGE_PER_CARD, ev);
}

// ---------------------------------------------------------------------------
// Ending the turn and the foes' turns
// ---------------------------------------------------------------------------

/** Ward the cards in hand would give if the turn ended now. */
export function heldWard(s: CardBattleState, hand = s.hand): number {
  const per = passiveSum(s.hero.passives, 'heldWard');
  let total = 0;
  for (const c of hand) {
    const st = statsOf(s, c);
    if (hasKeyword(st, 'fleeting') || hasKeyword(st, 'unplayable')) continue;
    total += st.ward + per;
  }
  return total;
}

function endTurn(s: CardBattleState, ev: CardEvent[]): void {
  const fleeting: number[] = [];
  const thrown: number[] = [];
  for (const c of [...s.hand]) {
    const st = statsOf(s, c);
    if (hasKeyword(st, 'fleeting')) {
      s.hand.splice(s.hand.indexOf(c), 1);
      s.spent.push(c);
      fleeting.push(c.uid);
    } else if (hasKeyword(st, 'unplayable')) {
      s.hand.splice(s.hand.indexOf(c), 1);
      s.discard.push(c);
      thrown.push(c.uid);
    }
  }
  if (fleeting.length) ev.push({ t: 'spend', uids: fleeting });
  if (thrown.length) ev.push({ t: 'discard', uids: thrown });
  if (s.hand.length > 0) {
    // Held cards ward you through the foes' turn, then go to the discard pile (unless Steadfast).
    const per = passiveSum(s.hero.passives, 'heldWard');
    s.heldWards = s.hand.map((c) => ({ uid: c.uid, ward: statsOf(s, c).ward + per }));
    const ward = s.heldWards.reduce((a, h) => a + h.ward, 0);
    s.hero.ward += ward;
    s.stats.heldWard += ward;
    s.stats.held += s.hand.length;
    ev.push({ t: 'held', uids: s.hand.map((c) => c.uid), ward });
    ev.push({ t: 'ward', unit: HERO, value: s.hero.ward });
    const used = s.hand.filter((c) => !hasKeyword(statsOf(s, c), 'steadfast'));
    if (used.length) {
      s.hand = s.hand.filter((c) => !used.includes(c));
      s.discard.push(...used);
      ev.push({ t: 'discard', uids: used.map((c) => c.uid) });
    }
  }
  tick(s.hero, HERO, 'chill', ev);
  foePhase(s, ev);
  if (!s.over) startTurn(s, ev);
}

function pickIntent(s: CardBattleState, f: FoeState, ev: CardEvent[]): void {
  let id: string;
  if (f.opener) {
    id = f.opener;
    f.opener = null;
  } else if (f.pattern && f.pattern.length > 0) {
    id = f.pattern[f.aiIndex % f.pattern.length]!;
    f.aiIndex++;
  } else {
    const weights = f.weights ?? {};
    id = rngWeighted(
      s.rng,
      f.moves.map((m) => ({ weight: weights[m.id] ?? 1, value: m.id })),
    );
  }
  f.intent = id;
  ev.push({ t: 'intent', unit: f.id, move: id });
}

/** Damage per hit a foe's move would deal to the hero right now, before ward. */
export function moveHit(s: CardBattleState, f: FoeState, m: FoeMove): number {
  if (!m.dmg) return 0;
  let dmg = m.dmg * f.power + (f.statuses.rage ?? 0);
  if (f.statuses.chill) dmg *= CHILL_MULT;
  if (s.hero.statuses.hex) dmg *= HEX_MULT;
  return Math.max(0, Math.round(dmg));
}

export function intentOf(f: FoeState): FoeMove | null {
  return f.intent ? (f.moves.find((m) => m.id === f.intent) ?? null) : null;
}

function heroHit(s: CardBattleState, f: FoeState, m: FoeMove, ev: CardEvent[]): void {
  const h = s.hero;
  const dmg = moveHit(s, f, m);
  const blocked = m.pierce ? 0 : Math.min(h.ward, dmg);
  h.ward -= blocked;
  const taken = dmg - blocked;
  h.hp = Math.max(0, h.hp - taken);
  s.stats.damageTaken += taken;
  s.stats.blocked += blocked;
  ev.push({ t: 'heroHit', from: f.id, amount: dmg, blocked, hp: h.hp, ward: h.ward });
  checkEnd(s, ev);
}

function doMove(s: CardBattleState, f: FoeState, m: FoeMove, ev: CardEvent[]): void {
  ev.push({ t: 'move', unit: f.id, move: m.id, name: m.name });
  const scaled = (v: number): number => Math.max(0, Math.round(v * f.power));
  if (m.shatter && s.heldWards.length > 0) {
    const best = s.heldWards.reduce((a, b) => (b.ward > a.ward ? b : a));
    s.heldWards = s.heldWards.filter((h) => h !== best);
    const lost = Math.min(s.hero.ward, best.ward);
    s.hero.ward -= lost;
    ev.push({ t: 'shatter', uid: best.uid, lost, ward: s.hero.ward });
  }
  if (m.dmg) {
    for (let i = 0; i < (m.hits ?? 1) && !s.over; i++) heroHit(s, f, m, ev);
  }
  if (s.over) return;
  if (m.afflict) addStatus(s.hero, HERO, m.afflict.status, m.afflict.stacks, ev);
  if (m.ward) {
    f.ward += scaled(m.ward);
    ev.push({ t: 'ward', unit: f.id, value: f.ward });
  }
  if (m.wardAll) {
    for (const o of living(s)) {
      o.ward += scaled(m.wardAll);
      ev.push({ t: 'ward', unit: o.id, value: o.ward });
    }
  }
  if (m.rage) addStatus(f, f.id, 'rage', m.rage, ev);
  if (m.rageAll) for (const o of living(s)) addStatus(o, o.id, 'rage', m.rageAll, ev);
  const healFoe = (o: FoeState, v: number): void => {
    const amt = Math.min(o.maxHp - o.hp, scaled(v));
    o.hp += amt;
    ev.push({ t: 'heal', unit: o.id, amount: amt, hp: o.hp });
  };
  if (m.heal) healFoe(f, m.heal);
  if (m.healAll) for (const o of living(s)) healFoe(o, m.healAll);
  if (m.curse) {
    for (let i = 0; i < m.curse; i++) s.discard.push({ uid: s.nextUid++, id: ASH_ID });
    ev.push({ t: 'curse', count: m.curse });
  }
  if (m.summon && living(s).length < MAX_FOES) {
    const setup = s.summons[m.summon];
    if (setup) {
      s.summoned++;
      const nf = foeState(setup, `s${s.summoned}:${setup.defId}`, s.foes.length);
      s.foes.push(nf);
      ev.push({ t: 'summon', unit: nf.id });
      pickIntent(s, nf, ev);
    }
  }
}

function foePhase(s: CardBattleState, ev: CardEvent[]): void {
  const acting = [...s.foes];
  if (s.turn >= LATE_TURN) ev.push({ t: 'late' });
  for (const f of acting) {
    if (s.over) return;
    if (!f.alive) continue;
    ev.push({ t: 'foeTurn', unit: f.id });
    if (f.ward > 0) {
      f.ward = 0;
      ev.push({ t: 'ward', unit: f.id, value: 0 });
    }
    const burn = f.statuses.burn ?? 0;
    if (burn > 0) {
      const amt = Math.min(f.hp, burn);
      f.hp -= amt;
      s.stats.damageDealt += amt;
      ev.push({ t: 'burn', unit: f.id, amount: amt, hp: f.hp });
      setStatus(f, f.id, 'burn', burn - 1, ev);
      if (f.hp <= 0) {
        ko(s, f, ev);
        checkEnd(s, ev);
        continue;
      }
    }
    if (f.broken) {
      ev.push({ t: 'skip', unit: f.id });
      f.broken = false;
      f.shell = f.maxShell;
      f.hardened = f.maxShell > 0;
      ev.push({ t: 'recover', unit: f.id, shell: f.shell });
    } else {
      if (s.turn >= LATE_TURN) addStatus(f, f.id, 'rage', f.tier === 'boss' ? 2 : 1, ev);
      const m = intentOf(f);
      if (m) doMove(s, f, m, ev);
      f.hardened = false;
      if (s.over) return;
    }
    tick(f, f.id, 'chill', ev);
    tick(f, f.id, 'hex', ev);
    pickIntent(s, f, ev);
  }
  checkEnd(s, ev);
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export function legalActions(s: CardBattleState): CardAction[] {
  if (s.over) return [];
  const out: CardAction[] = [];
  const alive = living(s);
  for (const c of s.hand) {
    if (!playable(s, c)) continue;
    const def = defOf(s, c);
    if (def.target === 'foe') for (const f of alive) out.push({ type: 'play', uid: c.uid, target: f.id });
    else out.push({ type: 'play', uid: c.uid });
  }
  out.push({ type: 'end' });
  return out;
}

export function submitAction(s: CardBattleState, a: CardAction): CardEvent[] {
  if (s.over) throw new Error('The fight is over');
  const ev: CardEvent[] = [];
  if (a.type === 'play') play(s, a.uid, a.target, ev);
  else endTurn(s, ev);
  return ev;
}

/** What ending the turn now would cost: incoming damage against the ward you would have. */
export function incoming(s: CardBattleState): { damage: number; pierce: number; ward: number; taken: number } {
  let damage = 0;
  let pierce = 0;
  for (const f of living(s)) {
    if (f.broken) continue;
    const m = intentOf(f);
    if (!m?.dmg) continue;
    const total = moveHit(s, f, m) * (m.hits ?? 1);
    if (m.pierce) pierce += total;
    else damage += total;
  }
  const ward = s.hero.ward + heldWard(s);
  return { damage, pierce, ward, taken: Math.max(0, damage - ward) + pierce };
}

export class CardBattle {
  readonly state: CardBattleState;
  readonly initialEvents: CardEvent[];

  private constructor(state: CardBattleState, initialEvents: CardEvent[]) {
    this.state = state;
    this.initialEvents = initialEvents;
  }

  static create(setup: BattleSetup, seed: string): CardBattle {
    const { state, events } = createBattle(setup, seed);
    return new CardBattle(state, events);
  }

  static from(state: CardBattleState): CardBattle {
    return new CardBattle(state, []);
  }

  clone(): CardBattle {
    return new CardBattle(cloneState(this.state), []);
  }

  get over(): boolean {
    return this.state.over;
  }

  get result(): CardBattleState['result'] {
    return this.state.result;
  }

  legalActions(): CardAction[] {
    return legalActions(this.state);
  }

  submit(a: CardAction): CardEvent[] {
    return submitAction(this.state, a);
  }
}
