import type { BattleStats } from './battle/state';
import type { UnitSetup } from './battle/defs';
import type { CardDef, HeroDef, StageDef } from './data';
import type { CrewMember, DescentRun } from './descent';
import {
  CLEAR_GLOAM,
  DAILY_GLOAM,
  WEEKLY_MILESTONE_DAYS,
  WEEKLY_MILESTONE_GLOAM,
  runRewards,
} from './descent';
import { dayKey, earn, newLedger, rollLedger, weekKey, type EarnSource, type Ledger } from './economy';
import {
  applyPullInPlace,
  expireBannerInPlace,
  newCollection,
  newKindlingState,
  type ApplyOutcome,
  type Collection,
  type ItemCatalog,
  type KindlingState,
  type PullResult,
} from './kindling';
import { RANK_UP_GLOAM, applyXp } from './progression';
import { cardPassives, heroUnit } from './setup';
import { TASK_GLOAM, newTaskState, tasksForDay, type TaskDef, type TaskEvent, type TaskState } from './tasks';

/** The player's whole saved state, and the rules for changing it. Pure data, JSON-safe. */

export const PROFILE_VERSION = 1;
export const STARTER_GLOAM = 1000;
export const PARTY_SIZE = 4;

export interface Settings {
  reducedMotion: boolean;
  /** Battle animation speed multiplier: 1 or 2. */
  battleSpeed: 1 | 2;
  autoBattle: boolean;
  /** Text size multiplier for the interface. */
  textScale: number;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  reducedMotion: false,
  battleSpeed: 1,
  autoBattle: false,
  textScale: 1,
  sound: true,
};

export interface DescentProgress {
  /** A run in progress, so closing the tab does not lose it. */
  run: DescentRun | null;
  clears: number;
  bestFloors: number;
  /** Day keys of daily runs cleared recently. */
  dailyClears: string[];
  /** The week the weekly milestone was last paid. */
  weeklyMilestone: string | null;
}

export interface Profile {
  v: typeof PROFILE_VERSION;
  createdAt: number;
  updatedAt: number;
  name: string;
  rank: number;
  xp: number;
  gloam: number;
  collection: Collection;
  party: string[];
  /** Memory Card equipped on each hero, by hero id. */
  equipped: Record<string, string>;
  kindling: KindlingState;
  /** The rate-up cycle last seen, so ended banners can pay out their leftover spark. */
  lastCycle: number;
  progress: { cleared: Record<string, number>; flags: Record<string, boolean> };
  ledger: Ledger;
  tasks: TaskState;
  descent: DescentProgress;
  settings: Settings;
}

export function newProfile(now: number, starters: readonly string[]): Profile {
  const collection = newCollection();
  for (const id of starters) collection.heroes[id] = { resonance: 1 };
  const ledger = newLedger(now);
  const p: Profile = {
    v: PROFILE_VERSION,
    createdAt: now,
    updatedAt: now,
    name: 'Lamplighter',
    rank: 1,
    xp: 0,
    gloam: 0,
    collection,
    party: [...starters].slice(0, PARTY_SIZE),
    equipped: {},
    kindling: newKindlingState(),
    lastCycle: 0,
    progress: { cleared: {}, flags: {} },
    ledger,
    tasks: newTaskState(dayKey(now)),
    descent: { run: null, clears: 0, bestFloors: 0, dailyClears: [], weeklyMilestone: null },
    settings: { ...DEFAULT_SETTINGS },
  };
  grantGloam(p, 'starter', STARTER_GLOAM, now);
  return p;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/**
 * Turn whatever was stored into a usable profile: fills in anything missing and drops nonsense.
 * Returns null only when the data is not a profile at all, so the caller can start fresh and
 * keep the old data aside.
 */
export function normalizeProfile(raw: unknown, now: number, starters: readonly string[]): Profile | null {
  if (!isObj(raw) || raw['v'] !== PROFILE_VERSION) return null;
  const base = newProfile(now, starters);
  const p: Profile = { ...base, gloam: 0 };
  p.createdAt = num(raw['createdAt'], now);
  p.updatedAt = num(raw['updatedAt'], now);
  if (typeof raw['name'] === 'string' && raw['name'].length > 0) p.name = raw['name'].slice(0, 24);
  p.rank = Math.max(1, Math.round(num(raw['rank'], 1)));
  p.xp = Math.max(0, Math.round(num(raw['xp'], 0)));
  p.gloam = Math.max(0, Math.round(num(raw['gloam'], 0)));
  p.lastCycle = Math.max(0, Math.round(num(raw['lastCycle'], 0)));

  const col = raw['collection'];
  if (isObj(col)) {
    const heroes: Collection['heroes'] = {};
    if (isObj(col['heroes'])) {
      for (const [id, v] of Object.entries(col['heroes'])) {
        if (isObj(v)) heroes[id] = { resonance: Math.min(5, Math.max(1, Math.round(num(v['resonance'], 1)))) };
      }
    }
    const cards: Collection['cards'] = {};
    if (isObj(col['cards'])) for (const [id, v] of Object.entries(col['cards'])) cards[id] = Math.min(5, Math.max(0, Math.round(num(v, 0))));
    p.collection = { heroes, cards };
  }
  if (Array.isArray(raw['party'])) {
    p.party = raw['party'].filter((id): id is string => typeof id === 'string' && !!p.collection.heroes[id]).slice(0, PARTY_SIZE);
  }
  if (p.party.length === 0) p.party = Object.keys(p.collection.heroes).slice(0, PARTY_SIZE);
  if (isObj(raw['equipped'])) {
    for (const [hero, card] of Object.entries(raw['equipped'])) {
      if (typeof card === 'string' && p.collection.heroes[hero] && (p.collection.cards[card] ?? 0) > 0) p.equipped[hero] = card;
    }
  }
  const k = raw['kindling'];
  if (isObj(k)) {
    const state = newKindlingState();
    if (isObj(k['pity'])) {
      for (const [g, v] of Object.entries(k['pity'])) {
        if (isObj(v)) state.pity[g] = { five: Math.max(0, num(v['five'], 0)), four: Math.max(0, num(v['four'], 0)), guaranteed: v['guaranteed'] === true };
      }
    }
    if (isObj(k['spark'])) for (const [id, v] of Object.entries(k['spark'])) state.spark[id] = Math.max(0, Math.round(num(v, 0)));
    if (Array.isArray(k['history'])) state.history = k['history'].filter(isObj).slice(-300) as unknown as KindlingState['history'];
    state.totalPulls = Math.max(0, Math.round(num(k['totalPulls'], 0)));
    p.kindling = state;
  }
  const prog = raw['progress'];
  if (isObj(prog)) {
    if (isObj(prog['cleared'])) for (const [id, v] of Object.entries(prog['cleared'])) p.progress.cleared[id] = Math.max(0, Math.round(num(v, 0)));
    if (isObj(prog['flags'])) for (const [id, v] of Object.entries(prog['flags'])) p.progress.flags[id] = v === true;
  }
  const led = raw['ledger'];
  if (isObj(led) && typeof led['day'] === 'string' && typeof led['week'] === 'string') {
    p.ledger = {
      day: led['day'],
      week: led['week'],
      daily: isObj(led['daily']) ? (Object.fromEntries(Object.entries(led['daily']).map(([a, b]) => [a, num(b, 0)])) as Ledger['daily']) : {},
      weekly: isObj(led['weekly']) ? (Object.fromEntries(Object.entries(led['weekly']).map(([a, b]) => [a, num(b, 0)])) as Ledger['weekly']) : {},
    };
  }
  const tasks = raw['tasks'];
  if (isObj(tasks) && typeof tasks['day'] === 'string') {
    p.tasks = {
      day: tasks['day'],
      progress: isObj(tasks['progress']) ? (Object.fromEntries(Object.entries(tasks['progress']).map(([a, b]) => [a, num(b, 0)])) as TaskState['progress']) : {},
      done: Array.isArray(tasks['done']) ? tasks['done'].filter((x): x is string => typeof x === 'string') : [],
    };
  }
  const d = raw['descent'];
  if (isObj(d)) {
    p.descent = {
      run: isObj(d['run']) && (d['run'] as { v?: unknown }).v === 1 ? (d['run'] as unknown as DescentRun) : null,
      clears: Math.max(0, Math.round(num(d['clears'], 0))),
      bestFloors: Math.max(0, Math.round(num(d['bestFloors'], 0))),
      dailyClears: Array.isArray(d['dailyClears']) ? d['dailyClears'].filter((x): x is string => typeof x === 'string').slice(-14) : [],
      weeklyMilestone: typeof d['weeklyMilestone'] === 'string' ? d['weeklyMilestone'] : null,
    };
  }
  const s = raw['settings'];
  if (isObj(s)) {
    p.settings = {
      reducedMotion: s['reducedMotion'] === true,
      battleSpeed: s['battleSpeed'] === 2 ? 2 : 1,
      autoBattle: s['autoBattle'] === true,
      textScale: [1, 1.15, 1.3].includes(num(s['textScale'], 1)) ? num(s['textScale'], 1) : 1,
      sound: s['sound'] !== false,
    };
  }
  return p;
}

// ---------------------------------------------------------------------------
// Gloam and Rank
// ---------------------------------------------------------------------------

/** Add earned Gloam, respecting the source's caps. Returns what was actually granted. */
export function grantGloam(p: Profile, source: EarnSource, amount: number, now: number): number {
  const granted = earn(p.ledger, source, amount, now);
  p.gloam += granted;
  p.updatedAt = now;
  return granted;
}

export function spendGloam(p: Profile, amount: number, now: number): boolean {
  if (amount < 0 || p.gloam < amount) return false;
  p.gloam -= amount;
  p.updatedAt = now;
  return true;
}

export interface XpResult {
  ranksGained: number;
  gloam: number;
}

export function addXp(p: Profile, xp: number, now: number): XpResult {
  const r = applyXp({ rank: p.rank, xp: p.xp }, xp);
  p.rank = r.rank;
  p.xp = r.xp;
  const gloam = r.ranksGained > 0 ? grantGloam(p, 'rank', r.ranksGained * RANK_UP_GLOAM, now) : 0;
  return { ranksGained: r.ranksGained, gloam };
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export interface StageRewards {
  first: boolean;
  gloam: number;
  xp: number;
  ranksGained: number;
  rankGloam: number;
  unlocked: string[];
}

/** Record a cleared stage. The first clear pays Gloam and unlocks heroes; repeats pay a little XP. */
export function clearStage(
  p: Profile,
  stage: Pick<StageDef, 'id' | 'firstClearGloam' | 'xp' | 'unlocks'>,
  now: number,
): StageRewards {
  const first = (p.progress.cleared[stage.id] ?? 0) === 0;
  p.progress.cleared[stage.id] = (p.progress.cleared[stage.id] ?? 0) + 1;
  const gloam = first ? grantGloam(p, 'story', stage.firstClearGloam, now) : 0;
  const xp = first ? stage.xp : Math.max(1, Math.round(stage.xp * 0.25));
  const up = addXp(p, xp, now);
  const unlocked: string[] = [];
  if (first) {
    for (const id of stage.unlocks ?? []) {
      if (!p.collection.heroes[id]) {
        p.collection.heroes[id] = { resonance: 1 };
        unlocked.push(id);
        if (p.party.length < PARTY_SIZE) p.party.push(id);
      }
    }
  }
  return { first, gloam, xp, ranksGained: up.ranksGained, rankGloam: up.gloam, unlocked };
}

// ---------------------------------------------------------------------------
// Kindling
// ---------------------------------------------------------------------------

/** The scripted first Kindling: calls up a hero without spending Gloam or touching pity. */
export function firstKindling(p: Profile, heroId: string, now: number): boolean {
  if (p.progress.flags['firstKindling']) return false;
  p.progress.flags['firstKindling'] = true;
  if (!p.collection.heroes[heroId]) {
    p.collection.heroes[heroId] = { resonance: 1 };
    if (p.party.length < PARTY_SIZE) p.party.push(heroId);
  }
  p.updatedAt = now;
  return true;
}

export interface PullOutcome extends ApplyOutcome {
  pull: PullResult;
}

/** Put pulled items into the collection. Maxed-out duplicates pay Gloam. */
export function applyPulls(p: Profile, results: readonly PullResult[], catalog: ItemCatalog, now: number): PullOutcome[] {
  return results.map((pull) => {
    const outcome = applyPullInPlace(p.collection, pull.item, catalog);
    if (outcome.gloam > 0) outcome.gloam = grantGloam(p, 'dupe', outcome.gloam, now);
    if (outcome.isNew && outcome.kind === 'hero' && p.party.length < PARTY_SIZE) p.party.push(pull.item);
    return { ...outcome, pull };
  });
}

/** When a rate-up banner ends, leftover spark points become Gloam. Call when the current cycle changes. */
export function expireBanners(p: Profile, currentCycle: number, now: number): number {
  let total = 0;
  for (const id of Object.keys(p.kindling.spark)) {
    const m = /^rateup-(\d+)$/.exec(id);
    if (m && Number(m[1]) < currentCycle) total += expireBannerInPlace(id, p.kindling);
  }
  p.lastCycle = currentCycle;
  return total > 0 ? grantGloam(p, 'spark', total, now) : 0;
}

// ---------------------------------------------------------------------------
// Party and cards
// ---------------------------------------------------------------------------

export function ownedHeroes(p: Profile): string[] {
  return Object.keys(p.collection.heroes);
}

export function setParty(p: Profile, ids: readonly string[]): void {
  const clean = ids.filter((id, i) => !!p.collection.heroes[id] && ids.indexOf(id) === i).slice(0, PARTY_SIZE);
  if (clean.length === 0) throw new Error('A party needs at least one owned hero');
  p.party = clean;
}

/** Equip a card on a hero, taking it off whoever had it. Pass null to unequip. */
export function equipCard(p: Profile, heroId: string, cardId: string | null): void {
  if (!p.collection.heroes[heroId]) throw new Error(`Not an owned hero: ${heroId}`);
  if (cardId === null) {
    delete p.equipped[heroId];
    return;
  }
  if ((p.collection.cards[cardId] ?? 0) === 0) throw new Error(`Not an owned card: ${cardId}`);
  for (const [h, c] of Object.entries(p.equipped)) if (c === cardId) delete p.equipped[h];
  p.equipped[heroId] = cardId;
}

export interface PartyDeps {
  hero(id: string): HeroDef;
  card(id: string): CardDef | undefined;
}

/** Battle units for a party, with Resonance and the equipped card applied. */
export function partyUnits(
  p: Profile,
  ids: readonly string[],
  deps: PartyDeps,
  carry: Record<string, { hpPct?: number; gauge?: number }> = {},
): UnitSetup[] {
  return ids.map((id) => {
    const cardId = p.equipped[id];
    const card = cardId ? deps.card(cardId) : undefined;
    const copies = cardId ? (p.collection.cards[cardId] ?? 0) : 0;
    return heroUnit(deps.hero(id), p.rank, p.collection.heroes[id]?.resonance ?? 1, card && copies > 0 ? cardPassives(card, copies) : [], carry[id] ?? {});
  });
}

/** Freeze the party as a Descent crew. */
export function crewFor(p: Profile, ids: readonly string[]): CrewMember[] {
  return ids.map((hero) => {
    const card = p.equipped[hero] ?? null;
    return { hero, resonance: p.collection.heroes[hero]?.resonance ?? 1, card, copies: card ? (p.collection.cards[card] ?? 0) : 0 };
  });
}

// ---------------------------------------------------------------------------
// Daily tasks
// ---------------------------------------------------------------------------

export interface TaskCompletion {
  task: TaskDef;
  gloam: number;
}

/** Start today's tasks if the day has changed. */
export function ensureTasks(p: Profile, now: number): void {
  rollLedger(p.ledger, now);
  const day = dayKey(now);
  if (p.tasks.day !== day) p.tasks = newTaskState(day);
}

export function recordEvent(p: Profile, event: TaskEvent, n: number, now: number): TaskCompletion[] {
  ensureTasks(p, now);
  if (n <= 0) return [];
  const out: TaskCompletion[] = [];
  for (const task of tasksForDay(p.tasks.day)) {
    if (task.event !== event || p.tasks.done.includes(task.id)) continue;
    const progress = Math.min(task.goal, (p.tasks.progress[task.id] ?? 0) + n);
    p.tasks.progress[task.id] = progress;
    if (progress >= task.goal) {
      p.tasks.done.push(task.id);
      out.push({ task, gloam: grantGloam(p, 'task', TASK_GLOAM, now) });
    }
  }
  return out;
}

/** Feed a finished battle into the daily tasks. */
export function recordBattle(p: Profile, stats: BattleStats, victory: boolean, now: number): TaskCompletion[] {
  return [
    ...recordEvent(p, 'wins', victory ? 1 : 0, now),
    ...recordEvent(p, 'breaks', stats.breaks, now),
    ...recordEvent(p, 'encores', stats.encores, now),
    ...recordEvent(p, 'passes', stats.passes, now),
    ...recordEvent(p, 'ultimates', stats.ultimates, now),
    ...recordEvent(p, 'bursts', stats.bursts, now),
  ];
}

// ---------------------------------------------------------------------------
// Descent settlement
// ---------------------------------------------------------------------------

export interface DescentSettlement {
  floorGloam: number;
  clearGloam: number;
  dailyGloam: number;
  weeklyGloam: number;
  xp: number;
  ranksGained: number;
  rankGloam: number;
  tasks: TaskCompletion[];
}

/** Pay out a finished run and clear it from the profile. */
export function settleDescent(p: Profile, run: DescentRun, now: number): DescentSettlement {
  const rewards = runRewards(run);
  const cleared = run.result === 'cleared';
  const clearPart = cleared ? CLEAR_GLOAM : 0;
  const floorPart = rewards.floorGloam - clearPart;
  const floorGloam = grantGloam(p, 'descentFloor', floorPart, now);
  const clearGloam = grantGloam(p, 'descentFloor', clearPart, now);

  let dailyGloam = 0;
  let weeklyGloam = 0;
  if (cleared && run.daily && !p.descent.dailyClears.includes(run.daily)) {
    p.descent.dailyClears.push(run.daily);
    p.descent.dailyClears = p.descent.dailyClears.slice(-14);
    dailyGloam = grantGloam(p, 'descentDaily', DAILY_GLOAM, now);
    const thisWeek = weekKey(now);
    const daysThisWeek = p.descent.dailyClears.filter((d) => weekKey(Date.parse(`${d}T12:00:00Z`)) === thisWeek).length;
    if (daysThisWeek >= WEEKLY_MILESTONE_DAYS && p.descent.weeklyMilestone !== thisWeek) {
      p.descent.weeklyMilestone = thisWeek;
      weeklyGloam = grantGloam(p, 'descentWeekly', WEEKLY_MILESTONE_GLOAM, now);
    }
  }

  const up = addXp(p, rewards.xp, now);
  const tasks = recordEvent(p, 'descentFloors', run.stats.floorsCleared, now);
  if (cleared) p.descent.clears++;
  p.descent.bestFloors = Math.max(p.descent.bestFloors, run.stats.floorsCleared);
  p.descent.run = null;
  return { floorGloam, clearGloam, dailyGloam, weeklyGloam, xp: rewards.xp, ranksGained: up.ranksGained, rankGloam: up.gloam, tasks };
}

// ---------------------------------------------------------------------------
// Feature gates
// ---------------------------------------------------------------------------

export type Feature = 'kindling' | 'roster' | 'tasks' | 'descent';

/** Features open up as the story teaches them. */
export function isUnlocked(p: Profile, feature: Feature): boolean {
  switch (feature) {
    case 'kindling':
    case 'roster':
    case 'tasks':
      return p.progress.flags['firstKindling'] === true;
    case 'descent':
      return (p.progress.cleared['1-2'] ?? 0) > 0;
  }
}
