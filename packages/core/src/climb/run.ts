import { HAND_LIMIT, MAX_LIGHT, ASH_ID } from '../cards/rules';
import { passiveSum, type BattleSetup, type CardDef, type FoeSetup, type Passive } from '../cards/defs';
import { addToStyle, generateEcho, newStyle } from '../cards/echo';
import { Rng, deriveSeed } from '../rng';
import type { EventOutcome, FoeDef } from '../data';
import { FLOORS, findNode, generateFloor } from './map';
import type { ClimbBattleResult, ClimbDeps, ClimbRun, EventFollow, MapNode, NodeKind, PathId, ShopItem } from './types';

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Share of max HP healed when you reach a new floor, and at a rest. */
export const FLOOR_HEAL = 0.2;
export const REST_HEAL = 0.3;
export const SHOP_HEAL = 0.3;
/** Max HP from Resonance (per rank above 1) and from Lamplighter Rank (per rank above 1). */
export const RESONANCE_HP = 0.05;
export const RANK_HP = 1;

/** Embers won per fight, as [low, high]. */
export const EMBERS: Record<'battle' | 'elite' | 'guardian' | 'boss', readonly [number, number]> = {
  battle: [14, 22],
  elite: [34, 44],
  guardian: [48, 58],
  boss: [80, 90],
};

export const PRICES = { common: 40, uncommon: 60, rare: 95, glimmer: 110, remove: 50, removeStep: 25, heal: 35, perStratum: 10 } as const;

/** Chances of common, uncommon and rare card offers after each kind of fight. */
const TIER_WEIGHTS: Record<'battle' | 'elite' | 'guardian' | 'boss' | 'shop', readonly [number, number, number]> = {
  battle: [65, 30, 5],
  elite: [40, 45, 15],
  guardian: [25, 50, 25],
  boss: [15, 45, 40],
  shop: [45, 38, 17],
};

const GLIMMER_WEIGHTS: Record<string, readonly [number, number, number]> = {
  start: [3, 2, 1],
  elite: [3, 4, 2],
  guardian: [2, 4, 3],
  boss: [1, 4, 4],
  shop: [3, 3, 2],
  event: [4, 3, 1],
};

// Gloam paid when a climb is settled.
export const FLOOR_GLOAM = 40;
export const CLEAR_GLOAM = 60;
export const DAILY_GLOAM = 120;
export const WEEKLY_MILESTONE_GLOAM = 300;
export const WEEKLY_MILESTONE_DAYS = 3;
export const XP_PER_BATTLE = 10;
export const XP_PER_FLOOR = 20;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findCard(run: ClimbRun, deps: ClimbDeps, id: string): CardDef | undefined {
  return deps.card(id) ?? run.echoes.find((e) => e.id === id);
}

export function requireCard(run: ClimbRun, deps: ClimbDeps, id: string): CardDef {
  const c = findCard(run, deps, id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function runPassives(run: ClimbRun, deps: ClimbDeps): Passive[] {
  return [...deps.hero(run.hero).trait.passives, ...run.glimmers.flatMap((g) => deps.glimmer(g).passives)];
}

export function currentNode(run: ClimbRun): MapNode | null {
  if (!run.at) return null;
  return findNode(run.floors[run.floor]!, run.at) ?? null;
}

/** Nodes the climber can step to next. */
export function mapChoices(run: ClimbRun): MapNode[] {
  if (run.phase !== 'map') return [];
  const map = run.floors[run.floor]!;
  const here = currentNode(run);
  if (!here) return map.rows[0] ?? [];
  return here.next.map((id) => findNode(map, id)).filter((n): n is MapNode => !!n);
}

export const canTemper = (def: CardDef | undefined, up: boolean | undefined): boolean => !!def?.plus && !up;

// ---------------------------------------------------------------------------
// Starting
// ---------------------------------------------------------------------------

export interface StartClimb {
  seed: string;
  daily: string | null;
  stratum: number;
  hero: string;
  resonance: number;
  rank: number;
  /** Kindled cards the player owns, by copies. */
  kindled: Record<string, number>;
  /** Echoes the player kept from earlier climbs. */
  archive: CardDef[];
}

export function maxHpFor(base: number, resonance: number, rank: number): number {
  return Math.round(base * (1 + RESONANCE_HP * (Math.max(1, resonance) - 1))) + RANK_HP * (Math.max(1, rank) - 1);
}

export function startClimb(o: StartClimb, deps: ClimbDeps): ClimbRun {
  const hero = deps.hero(o.hero);
  const stratum = deps.stratum(o.stratum);
  const used = new Set<string>();
  const floors = Array.from({ length: FLOORS }, (_, f) => generateFloor(o.seed, stratum, f, used));
  const maxHp = maxHpFor(hero.hp, o.resonance, o.rank);
  let uid = 1;
  const deck = hero.starter.map((id) => {
    const def = deps.card(id);
    if (!def) throw new Error(`${hero.id} starts with an unknown card: ${id}`);
    return { uid: uid++, id, ...(o.resonance >= 3 && def.source === 'hero' ? { up: true } : {}) };
  });
  const run: ClimbRun = {
    v: 2,
    seed: o.seed,
    daily: o.daily,
    stratum: o.stratum,
    hero: o.hero,
    resonance: o.resonance,
    floors,
    floor: 0,
    at: null,
    visited: [],
    hp: maxHp,
    maxHp,
    embers: 0,
    deck,
    nextUid: uid,
    glimmers: [],
    pathScore: { noonward: 0, duskward: 0, nightward: 0 },
    echoes: o.archive.map((e) => structuredClone(e)),
    echoCount: 0,
    archived: o.archive.map((e) => e.id),
    kindled: { ...o.kindled },
    phase: 'map',
    node: null,
    glimmerOffer: null,
    reward: null,
    shop: null,
    removePrice: PRICES.remove,
    event: null,
    mirror: null,
    pick: null,
    battle: null,
    style: newStyle(),
    usedEvents: [...used],
    result: null,
    stats: { battles: 0, elites: 0, floorsCleared: 0, turns: 0, breaks: 0, echoesTaken: 0, reachedFloor: 0 },
  };
  // A free Glimmer before the first step, so a climber can cover a weak spot.
  const offer = offerGlimmers(run, deps, 'start');
  if (offer.length > 0) {
    run.glimmerOffer = offer;
    run.phase = 'glimmer';
  }
  return run;
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export function offerGlimmers(run: ClimbRun, deps: ClimbDeps, kind: string): string[] {
  const rng = new Rng(deriveSeed(run.seed, 'glimmer', run.node?.id ?? 'start', run.glimmers.length, kind));
  const weights = GLIMMER_WEIGHTS[kind] ?? GLIMMER_WEIGHTS['event']!;
  const remaining = deps.glimmers().filter((g) => !run.glimmers.includes(g.id));
  const out: string[] = [];
  while (out.length < 3 && remaining.length > 0) {
    const g = rng.weighted(remaining.map((x) => ({ weight: weights[x.rarity - 1]! * (1 + run.pathScore[x.path as PathId]), value: x })));
    out.push(g.id);
    remaining.splice(remaining.indexOf(g), 1);
  }
  return out;
}

interface Candidate {
  def: CardDef;
  weight: number;
  up: boolean;
}

/** Cards this climber could be offered: the pool, their signatures, kindled cards and archived Echoes. */
function candidates(run: ClimbRun, deps: ClimbDeps): Candidate[] {
  const out: Candidate[] = deps.pool().map((def) => ({ def, weight: 1, up: false }));
  for (const id of deps.hero(run.hero).signature) {
    const def = deps.card(id);
    if (def) out.push({ def, weight: 1.6, up: false });
  }
  for (const [id, copies] of Object.entries(run.kindled)) {
    const def = deps.card(id);
    if (def && copies > 0) out.push({ def, weight: 1 + 0.25 * (copies - 1), up: copies >= 3 && !!def.plus });
  }
  for (const id of run.archived) {
    const def = run.echoes.find((e) => e.id === id);
    if (def) out.push({ def, weight: 0.8, up: false });
  }
  return out;
}

const TIERS = ['common', 'uncommon', 'rare'] as const;

function offerFrom(run: ClimbRun, deps: ClimbDeps, rng: Rng, count: number, weights: readonly [number, number, number], first: Array<{ id: string; up: boolean }> = []): Array<{ id: string; up: boolean }> {
  const all = candidates(run, deps);
  const out = [...first];
  let guard = 0;
  while (out.length < count && guard++ < 50) {
    const tier = rng.weighted(TIERS.map((t, i) => ({ weight: weights[i]!, value: t })));
    let pool = all.filter((c) => c.def.tier === tier && !out.some((o) => o.id === c.def.id));
    if (pool.length === 0) pool = all.filter((c) => !out.some((o) => o.id === c.def.id));
    if (pool.length === 0) break;
    const c = rng.weighted(pool.map((x) => ({ weight: x.weight, value: x })));
    out.push({ id: c.def.id, up: c.up });
  }
  return out;
}

function boundCards(deps: ClimbDeps, encounter: string): string[] {
  const enc = deps.encounter(encounter);
  const ids = enc.foes.map((sp) => deps.foe(sp.foe).bind).filter((b): b is string => !!b && !!deps.card(b));
  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// Moving on the map
// ---------------------------------------------------------------------------

function echoFor(run: ClimbRun, deps: ClimbDeps): CardDef {
  return generateEcho(run.style, { seed: run.seed, index: run.echoCount++, heroAffinity: deps.hero(run.hero).affinity, stratum: run.stratum });
}

function stockShop(run: ClimbRun, deps: ClimbDeps, node: MapNode): ShopItem[] {
  const rng = new Rng(deriveSeed(run.seed, 'shop', node.id));
  const extra = PRICES.perStratum * run.stratum;
  const items: ShopItem[] = offerFrom(run, deps, rng, 4, TIER_WEIGHTS.shop).map((c) => {
    const def = requireCard(run, deps, c.id);
    const tier = def.tier === 'rare' ? 'rare' : def.tier === 'uncommon' ? 'uncommon' : 'common';
    return { kind: 'card', id: c.id, price: PRICES[tier] + extra + (c.up ? 15 : 0), sold: false, ...(c.up ? { up: true } : {}) };
  });
  const g = offerGlimmers(run, deps, 'shop')[0];
  if (g) items.push({ kind: 'glimmer', id: g, price: PRICES.glimmer + extra, sold: false });
  items.push({ kind: 'heal', id: null, price: PRICES.heal, sold: false });
  items.push({ kind: 'remove', id: null, price: run.removePrice, sold: false });
  return items;
}

export function moveTo(run: ClimbRun, deps: ClimbDeps, nodeId: string): void {
  const node = mapChoices(run).find((n) => n.id === nodeId);
  if (!node) throw new Error(`${nodeId} is not a step you can take`);
  run.at = node.id;
  run.visited.push(node.id);
  run.node = node;
  switch (node.kind) {
    case 'battle':
    case 'elite':
    case 'guardian':
    case 'boss':
      run.battle = { encounter: node.encounter!, kind: node.kind, seed: deriveSeed(run.seed, 'fight', node.id).toString(36) };
      run.phase = 'battle';
      break;
    case 'event':
      run.event = { id: node.event!, choice: null, text: null, follow: null };
      run.phase = 'event';
      break;
    case 'shop':
      run.shop = stockShop(run, deps, node);
      run.phase = 'shop';
      break;
    case 'rest':
      run.phase = 'rest';
      break;
    case 'mirror':
      run.mirror = [echoFor(run, deps), echoFor(run, deps)];
      run.phase = 'mirror';
      break;
  }
}

/** Close the current node and return to the map, or climb to the next floor. */
function finishNode(run: ClimbRun): void {
  const node = run.node;
  run.node = null;
  run.reward = null;
  run.shop = null;
  run.event = null;
  run.mirror = null;
  run.pick = null;
  run.glimmerOffer = null;
  if (node && (node.kind === 'guardian' || node.kind === 'boss')) {
    run.stats.floorsCleared++;
    if (run.floor + 1 >= FLOORS) {
      run.phase = 'done';
      run.result = 'cleared';
      return;
    }
    run.floor++;
    run.at = null;
    run.stats.reachedFloor = run.floor;
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * FLOOR_HEAL));
  }
  run.phase = 'map';
}

function addCard(run: ClimbRun, id: string, up = false): void {
  run.deck.push({ uid: run.nextUid++, id, ...(up ? { up: true } : {}) });
}

// ---------------------------------------------------------------------------
// Fights
// ---------------------------------------------------------------------------

function foeSetup(def: FoeDef, hp: number, power: number): FoeSetup {
  return {
    id: def.id,
    defId: def.id,
    name: def.name,
    family: def.family,
    tier: def.tier,
    hp: Math.max(1, Math.round(def.hp * hp)),
    shell: def.shell,
    weaknesses: def.weaknesses,
    resists: def.resists,
    moves: def.moves,
    ...(def.pattern ? { pattern: def.pattern } : {}),
    ...(def.weights ? { weights: def.weights } : {}),
    ...(def.opener ? { opener: def.opener } : {}),
    power,
  };
}

/** The card table a fight needs: the deck, the hero's ultimate, Ash and any Echoes. */
export function cardTable(run: ClimbRun, deps: ClimbDeps): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  const need = new Set<string>([...run.deck.map((c) => c.id), deps.hero(run.hero).ultimate, ASH_ID]);
  for (const id of need) out[id] = requireCard(run, deps, id);
  return out;
}

/** Foe scaling for the floor being climbed. */
export function floorScale(run: ClimbRun, deps: ClimbDeps): { hp: number; power: number } {
  const s = deps.stratum(run.stratum);
  return { hp: s.hpScale * (1 + 0.1 * run.floor), power: s.powerScale * (1 + 0.07 * run.floor) };
}

export function battleSetup(run: ClimbRun, deps: ClimbDeps): BattleSetup {
  if (run.phase !== 'battle' || !run.battle) throw new Error('No fight is waiting');
  const enc = deps.encounter(run.battle.encounter);
  const scale = floorScale(run, deps);
  const hero = deps.hero(run.hero);
  const summons: Record<string, FoeSetup> = {};
  for (const id of enc.summons ?? []) summons[id] = foeSetup(deps.foe(id), scale.hp, scale.power);
  return {
    hero: {
      id: hero.id,
      name: hero.name,
      affinity: hero.affinity,
      maxHp: run.maxHp,
      hp: run.hp,
      maxLight: MAX_LIGHT,
      handLimit: HAND_LIMIT,
      ultimate: hero.ultimate,
      ultimateUp: run.resonance >= 5,
      passives: runPassives(run, deps),
    },
    deck: run.deck.map((c) => ({ ...c })),
    cards: cardTable(run, deps),
    foes: enc.foes.map((sp) => foeSetup(deps.foe(sp.foe), scale.hp * (sp.hp ?? 1), scale.power * (sp.power ?? 1))),
    summons,
  };
}

/** Record a finished fight: HP carries over, then the spoils are offered. */
export function finishFight(run: ClimbRun, deps: ClimbDeps, r: ClimbBattleResult): void {
  const b = run.battle;
  if (run.phase !== 'battle' || !b) throw new Error('No fight is in progress');
  addToStyle(run.style, r.stats);
  run.stats.turns += r.stats.turns;
  run.stats.breaks += r.stats.breaks;
  run.battle = null;
  if (!r.victory) {
    run.hp = 0;
    run.phase = 'done';
    run.result = 'failed';
    return;
  }
  run.stats.battles++;
  if (b.kind === 'elite') run.stats.elites++;
  const passives = runPassives(run, deps);
  run.hp = Math.min(run.maxHp, Math.max(1, Math.round(r.hp)) + passiveSum(passives, 'victoryHeal'));
  const kind = b.kind === 'elite' || b.kind === 'guardian' || b.kind === 'boss' ? b.kind : 'battle';
  const rng = new Rng(deriveSeed(run.seed, 'spoils', b.seed));
  const [lo, hi] = EMBERS[kind];
  const embers = Math.round((lo + rng.int(hi - lo + 1)) * (1 + passiveSum(passives, 'emberGain')));
  run.embers += embers;
  const bound = boundCards(deps, b.encounter);
  const first = bound.length > 0 && rng.chance(kind === 'battle' ? 0.6 : 0.85) ? [{ id: rng.pick(bound), up: false }] : [];
  const glimmers = kind === 'battle' ? [] : offerGlimmers(run, deps, kind);
  run.reward = {
    embers,
    cards: offerFrom(run, deps, rng, 3, TIER_WEIGHTS[kind], first),
    cardDone: false,
    glimmers: glimmers.length > 0 ? glimmers : null,
  };
  run.phase = 'reward';
}

/** Take one of the offered cards, or pass with null. */
export function takeReward(run: ClimbRun, index: number | null): void {
  const r = run.reward;
  if (run.phase !== 'reward' || !r || r.cardDone) throw new Error('No card offer is open');
  if (index !== null) {
    const c = r.cards[index];
    if (!c) throw new Error('No such card on offer');
    addCard(run, c.id, c.up);
  }
  r.cardDone = true;
  if (r.glimmers) {
    run.glimmerOffer = r.glimmers;
    run.phase = 'glimmer';
  } else finishNode(run);
}

function applyGlimmer(run: ClimbRun, deps: ClimbDeps, id: string): void {
  const g = deps.glimmer(id);
  run.glimmers.push(id);
  run.pathScore[g.path]++;
  for (const p of g.passives) {
    if (p.type === 'maxHp') {
      run.maxHp += p.value;
      run.hp += p.value;
    }
  }
}

export function pickGlimmer(run: ClimbRun, deps: ClimbDeps, id: string): void {
  if (run.phase !== 'glimmer' || !run.glimmerOffer?.includes(id)) throw new Error(`${id} is not on offer`);
  applyGlimmer(run, deps, id);
  run.glimmerOffer = null;
  if (run.node === null) run.phase = 'map';
  else finishNode(run);
}

// ---------------------------------------------------------------------------
// Rests, shops, Mirrors and picking cards
// ---------------------------------------------------------------------------

export function rest(run: ClimbRun, deps: ClimbDeps, choice: 'heal' | 'temper'): void {
  if (run.phase !== 'rest') throw new Error('There is no rest here');
  if (choice === 'heal') {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * REST_HEAL));
    finishNode(run);
    return;
  }
  if (!run.deck.some((c) => canTemper(findCard(run, deps, c.id), c.up))) throw new Error('Nothing left to temper');
  run.pick = { mode: 'upgrade', back: 'advance' };
  run.phase = 'pick';
}

export function buy(run: ClimbRun, deps: ClimbDeps, index: number): void {
  if (run.phase !== 'shop' || !run.shop) throw new Error('There is no shop here');
  const item = run.shop[index];
  if (!item || item.sold) throw new Error('That is not for sale');
  if (run.embers < item.price) throw new Error('Not enough Embers');
  switch (item.kind) {
    case 'card':
      addCard(run, item.id!, item.up === true);
      break;
    case 'glimmer':
      applyGlimmer(run, deps, item.id!);
      break;
    case 'heal':
      run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * SHOP_HEAL));
      break;
    case 'remove':
      // Paid when a card is actually chosen.
      run.pick = { mode: 'remove', back: 'shop', shopIndex: index };
      run.phase = 'pick';
      return;
  }
  run.embers -= item.price;
  item.sold = true;
}

export function leaveShop(run: ClimbRun): void {
  if (run.phase !== 'shop') throw new Error('There is no shop here');
  finishNode(run);
}

export function takeEcho(run: ClimbRun, index: number | null): void {
  if (run.phase !== 'mirror' || !run.mirror) throw new Error('There is no Mirror here');
  if (index !== null) {
    const e = run.mirror[index];
    if (!e) throw new Error('No such Echo');
    if (!run.echoes.some((x) => x.id === e.id)) run.echoes.push(e);
    addCard(run, e.id);
    run.stats.echoesTaken++;
  }
  finishNode(run);
}

/** Choose a card from the deck for the open pick, or null to back out. */
export function pickCard(run: ClimbRun, deps: ClimbDeps, uid: number | null): void {
  const p = run.pick;
  if (run.phase !== 'pick' || !p) throw new Error('Nothing to pick');
  if (uid !== null) {
    const inst = run.deck.find((c) => c.uid === uid);
    if (!inst) throw new Error('That card is not in the deck');
    if (p.mode === 'remove') {
      if (run.deck.length <= 5) throw new Error('A deck needs at least five cards');
      run.deck = run.deck.filter((c) => c.uid !== uid);
      if (p.shopIndex !== undefined && run.shop) {
        const item = run.shop[p.shopIndex]!;
        run.embers -= item.price;
        item.sold = true;
        run.removePrice += PRICES.removeStep;
      }
    } else if (p.mode === 'upgrade') {
      if (!canTemper(findCard(run, deps, inst.id), inst.up)) throw new Error('That card cannot be tempered');
      inst.up = true;
    } else {
      addCard(run, inst.id, inst.up === true);
    }
  }
  run.pick = null;
  if (p.back === 'shop') run.phase = 'shop';
  else finishNode(run);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function applyOutcomes(run: ClimbRun, deps: ClimbDeps, outs: readonly EventOutcome[], rng: Rng, say: (t: string) => void): EventFollow | null {
  let follow: EventFollow | null = null;
  for (const o of outs) {
    switch (o.type) {
      case 'hp':
        run.hp = Math.max(0, Math.min(run.maxHp, run.hp + o.amount));
        break;
      case 'maxHp':
        run.maxHp = Math.max(10, run.maxHp + o.amount);
        run.hp = Math.min(run.maxHp, Math.max(0, run.hp + Math.max(0, o.amount)));
        break;
      case 'embers':
        run.embers = Math.max(0, run.embers + o.amount);
        break;
      case 'card':
        addCard(run, o.card);
        break;
      case 'randomCard': {
        const w: [number, number, number] = o.tier === 'rare' ? [0, 0, 1] : o.tier === 'uncommon' ? [0, 1, 0] : [1, 0, 0];
        const [c] = offerFrom(run, deps, rng, 1, w);
        if (c) addCard(run, c.id, c.up);
        break;
      }
      case 'curse':
        for (let i = 0; i < o.count; i++) addCard(run, ASH_ID);
        break;
      case 'upgradeRandom': {
        const open = run.deck.filter((c) => canTemper(findCard(run, deps, c.id), c.up));
        for (let i = 0; i < o.count && open.length > 0; i++) {
          const c = open.splice(rng.int(open.length), 1)[0]!;
          c.up = true;
        }
        break;
      }
      case 'glimmer':
        follow = { type: 'glimmer' };
        break;
      case 'pick':
        follow = { type: 'pick', mode: o.mode };
        break;
      case 'fight':
        follow = { type: 'fight', encounter: o.encounter };
        break;
      case 'echo':
        follow = { type: 'echo' };
        break;
      case 'chance':
        if (rng.chance(o.p)) {
          say(o.winText);
          follow = applyOutcomes(run, deps, o.win, rng, say) ?? follow;
        } else {
          say(o.loseText);
          follow = applyOutcomes(run, deps, o.lose, rng, say) ?? follow;
        }
        break;
    }
  }
  return follow;
}

export function canAfford(run: ClimbRun, cost: { embers?: number; hp?: number } | undefined): boolean {
  if (!cost) return true;
  return run.embers >= (cost.embers ?? 0) && run.hp > (cost.hp ?? 0);
}

export function chooseEvent(run: ClimbRun, deps: ClimbDeps, index: number): void {
  const ev = run.event;
  if (run.phase !== 'event' || !ev || ev.choice !== null) throw new Error('No event is waiting for a choice');
  const def = deps.event(ev.id);
  const ch = def.choices[index];
  if (!ch) throw new Error('No such choice');
  if (!canAfford(run, ch.cost)) throw new Error('You cannot pay for that');
  run.embers -= ch.cost?.embers ?? 0;
  run.hp -= ch.cost?.hp ?? 0;
  const rng = new Rng(deriveSeed(run.seed, 'event', ev.id, index));
  let text = ch.after;
  ev.follow = applyOutcomes(run, deps, ch.outcome, rng, (t) => (text = t));
  ev.choice = index;
  ev.text = text;
  if (run.hp <= 0) {
    run.hp = 0;
    run.phase = 'done';
    run.result = 'failed';
  }
}

/** Leave an event after its text, into whatever it started. */
export function leaveEvent(run: ClimbRun, deps: ClimbDeps): void {
  const ev = run.event;
  if (run.phase !== 'event' || !ev || ev.choice === null) throw new Error('Choose first');
  const f = ev.follow;
  if (!f) return finishNode(run);
  switch (f.type) {
    case 'fight': {
      const elite = deps.stratum(run.stratum).elites.includes(f.encounter);
      run.battle = { encounter: f.encounter, kind: elite ? 'elite' : 'battle', seed: deriveSeed(run.seed, 'eventfight', ev.id).toString(36) };
      run.phase = 'battle';
      break;
    }
    case 'glimmer': {
      const offer = offerGlimmers(run, deps, 'event');
      if (offer.length === 0) return finishNode(run);
      run.glimmerOffer = offer;
      run.phase = 'glimmer';
      break;
    }
    case 'pick':
      run.pick = { mode: f.mode, back: 'advance' };
      run.phase = 'pick';
      break;
    case 'echo':
      run.mirror = [echoFor(run, deps)];
      run.phase = 'mirror';
      break;
  }
}

/** Give up the climb. What has been cleared still pays. */
export function abandonClimb(run: ClimbRun): void {
  run.phase = 'done';
  run.result = 'failed';
  run.battle = null;
}

// ---------------------------------------------------------------------------
// Pay
// ---------------------------------------------------------------------------

export interface ClimbRewards {
  floorGloam: number;
  clearGloam: number;
  xp: number;
}

export function climbRewards(run: ClimbRun): ClimbRewards {
  const cleared = run.result === 'cleared';
  return {
    floorGloam: run.stats.floorsCleared * FLOOR_GLOAM,
    clearGloam: cleared ? CLEAR_GLOAM : 0,
    xp: run.stats.battles * XP_PER_BATTLE + run.stats.floorsCleared * XP_PER_FLOOR,
  };
}

/** Kinds of node, for filters in the client and the simulator. */
export const isFight = (k: NodeKind): boolean => k === 'battle' || k === 'elite' || k === 'guardian' || k === 'boss';
