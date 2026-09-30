import type { CardDef } from './cards/defs';
import type { CardBattleStats } from './cards/state';
import {
  DAILY_GLOAM,
  WEEKLY_MILESTONE_DAYS,
  WEEKLY_MILESTONE_GLOAM,
  climbRewards,
  type ClimbRun,
  type NodeKind,
  type StartClimb,
} from './climb';
import type { BeatDef } from './data';
import { dayKey, earn, newLedger, rollLedger, weekKey, type EarnSource, type Ledger } from './economy';
import {
  applyPullInPlace,
  expireBannerInPlace,
  newCollection,
  newKindlingState,
  pullManyInPlace,
  redeemSparkInPlace,
  type ApplyOutcome,
  type BannerDef,
  type Collection,
  type ItemCatalog,
  type KindlingState,
  type PullResult,
} from './kindling';
import { RANK_UP_GLOAM, applyXp } from './progression';
import type { RngState } from './rng';
import { TASK_GLOAM, newTaskState, tasksForDay, type TaskDef, type TaskEvent, type TaskState } from './tasks';

/** The player's whole saved state, and the rules for changing it. Pure data, JSON-safe. */

export const PROFILE_VERSION = 2;
export const STARTER_GLOAM = 1000;
/** Echoes a player can keep between climbs. */
export const ARCHIVE_SIZE = 12;

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

export interface StratumRecord {
  clears: number;
  /** Highest floor index reached, 0 to 2. */
  reached: number;
}

export interface ClimbProgress {
  /** A climb in progress, so closing the tab does not lose it. */
  run: ClimbRun | null;
  runs: number;
  /** Day keys of daily climbs cleared recently. */
  dailyClears: string[];
  /** The week the weekly milestone was last paid. */
  weeklyMilestone: string | null;
  /** By stratum index. */
  strata: Record<string, StratumRecord>;
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
  /** The hero picked for the next climb. */
  hero: string;
  /** Echoes kept from earlier climbs. They can turn up as rewards. */
  archive: CardDef[];
  kindling: KindlingState;
  /** The rate-up cycle last seen, so ended banners can pay out their leftover spark. */
  lastCycle: number;
  progress: { flags: Record<string, boolean>; beats: string[] };
  ledger: Ledger;
  tasks: TaskState;
  climb: ClimbProgress;
  settings: Settings;
}

export function newProfile(now: number, starters: readonly string[]): Profile {
  const collection = newCollection();
  for (const id of starters) collection.heroes[id] = { resonance: 1 };
  const p: Profile = {
    v: PROFILE_VERSION,
    createdAt: now,
    updatedAt: now,
    name: 'Lamplighter',
    rank: 1,
    xp: 0,
    gloam: 0,
    collection,
    hero: starters[0] ?? '',
    archive: [],
    kindling: newKindlingState(),
    lastCycle: 0,
    progress: { flags: {}, beats: [] },
    ledger: newLedger(now),
    tasks: newTaskState(dayKey(now)),
    climb: { run: null, runs: 0, dailyClears: [], weeklyMilestone: null, strata: {} },
    settings: { ...DEFAULT_SETTINGS },
  };
  grantGloam(p, 'starter', STARTER_GLOAM, now);
  return p;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Version 1 saves counted Descent pay under other names. */
const LEDGER_RENAMES: Record<string, string> = { descentFloor: 'climbFloor', descentDaily: 'climbDaily', descentWeekly: 'climbWeekly' };

function ledgerMap(v: unknown): Record<string, number> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).map(([k, n]) => [LEDGER_RENAMES[k] ?? k, num(n, 0)]));
}

function looksLikeEcho(v: unknown): v is CardDef {
  return isObj(v) && typeof v['id'] === 'string' && v['id'].startsWith('echo:') && typeof v['name'] === 'string' && typeof v['cost'] === 'number' && isObj(v['art']);
}

/**
 * Turn whatever was stored into a usable profile: fills in anything missing, drops nonsense and
 * carries version 1 saves forward. Returns null only when the data is not a profile at all, so
 * the caller can start fresh and keep the old data aside.
 */
export function normalizeProfile(raw: unknown, now: number, starters: readonly string[]): Profile | null {
  if (!isObj(raw) || (raw['v'] !== 1 && raw['v'] !== PROFILE_VERSION)) return null;
  const legacy = raw['v'] === 1;
  const p: Profile = { ...newProfile(now, starters), gloam: 0 };
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
  for (const id of starters) if (!p.collection.heroes[id]) p.collection.heroes[id] = { resonance: 1 };

  const picked = legacy ? strs(raw['party'])[0] : raw['hero'];
  p.hero = typeof picked === 'string' && p.collection.heroes[picked] ? picked : (Object.keys(p.collection.heroes)[0] ?? '');
  if (!legacy && Array.isArray(raw['archive'])) p.archive = raw['archive'].filter(looksLikeEcho).slice(-ARCHIVE_SIZE);

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
    if (isObj(prog['flags'])) for (const [id, v] of Object.entries(prog['flags'])) p.progress.flags[id] = v === true;
    p.progress.beats = strs(prog['beats']);
    // A version 1 player who saw the prologue has seen the opening scene.
    if (legacy && p.progress.flags['seenPrologue']) p.progress.beats.push('prologue');
  }

  const led = raw['ledger'];
  if (isObj(led) && typeof led['day'] === 'string' && typeof led['week'] === 'string') {
    p.ledger = { day: led['day'], week: led['week'], daily: ledgerMap(led['daily']), weekly: ledgerMap(led['weekly']) };
  }
  const tasks = raw['tasks'];
  if (!legacy && isObj(tasks) && typeof tasks['day'] === 'string') {
    p.tasks = {
      day: tasks['day'],
      progress: isObj(tasks['progress']) ? (Object.fromEntries(Object.entries(tasks['progress']).map(([a, b]) => [a, num(b, 0)])) as TaskState['progress']) : {},
      done: strs(tasks['done']),
    };
  }

  const c = legacy ? raw['descent'] : raw['climb'];
  if (isObj(c)) {
    p.climb.dailyClears = strs(c['dailyClears']).slice(-14);
    p.climb.weeklyMilestone = typeof c['weeklyMilestone'] === 'string' ? c['weeklyMilestone'] : null;
    if (!legacy) {
      p.climb.runs = Math.max(0, Math.round(num(c['runs'], 0)));
      p.climb.run = isObj(c['run']) && (c['run'] as { v?: unknown }).v === 2 ? (c['run'] as unknown as ClimbRun) : null;
      if (isObj(c['strata'])) {
        for (const [id, v] of Object.entries(c['strata'])) {
          if (isObj(v)) p.climb.strata[id] = { clears: Math.max(0, Math.round(num(v['clears'], 0))), reached: Math.max(0, Math.min(2, Math.round(num(v['reached'], 0)))) };
        }
      }
    }
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
// Kindling
// ---------------------------------------------------------------------------

/** The scripted first Kindling: calls up a hero without spending Gloam or touching pity. */
export function firstKindling(p: Profile, heroId: string, now: number): boolean {
  if (p.progress.flags['firstKindling']) return false;
  p.progress.flags['firstKindling'] = true;
  if (!p.collection.heroes[heroId]) p.collection.heroes[heroId] = { resonance: 1 };
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
    return { ...outcome, pull };
  });
}

/** Gloam price of a pull run: the ten-pull discount applies to exactly ten. */
export function kindleCost(banner: BannerDef, count: number): number {
  return count === 10 ? banner.cost.ten : banner.cost.single * count;
}

/** Spend Gloam and pull. Returns null, changing nothing, when the player cannot afford it. */
export function kindle(p: Profile, banner: BannerDef, count: number, rng: RngState, catalog: ItemCatalog, now: number): PullOutcome[] | null {
  if (!spendGloam(p, kindleCost(banner, count), now)) return null;
  const results = pullManyInPlace(banner, p.kindling, rng, count, { at: now });
  return applyPulls(p, results, catalog, now);
}

/** Trade a banner's spark points for a featured 5-star. Returns null when the spark is not ready. */
export function redeemSpark(p: Profile, banner: BannerDef, itemId: string, catalog: ItemCatalog, now: number): ApplyOutcome | null {
  const at = banner.rules.spark?.at;
  if (at === undefined || (p.kindling.spark[banner.id] ?? 0) < at || !banner.featured.five.includes(itemId)) return null;
  redeemSparkInPlace(banner, p.kindling, itemId);
  const outcome = applyPullInPlace(p.collection, itemId, catalog);
  if (outcome.gloam > 0) outcome.gloam = grantGloam(p, 'dupe', outcome.gloam, now);
  p.updatedAt = now;
  return outcome;
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
// Heroes, the archive and starting a climb
// ---------------------------------------------------------------------------

export function ownedHeroes(p: Profile): string[] {
  return Object.keys(p.collection.heroes);
}

export function setHero(p: Profile, id: string): void {
  if (!p.collection.heroes[id]) throw new Error(`Not an owned hero: ${id}`);
  p.hero = id;
}

/** Keep an Echo for later climbs. The oldest one goes when the archive is full. */
export function archiveEcho(p: Profile, echo: CardDef): void {
  if (!echo.id.startsWith('echo:')) throw new Error('Only Echoes can be archived');
  p.archive = [...p.archive.filter((e) => e.id !== echo.id), structuredClone(echo)].slice(-ARCHIVE_SIZE);
}

export function releaseEcho(p: Profile, id: string): void {
  p.archive = p.archive.filter((e) => e.id !== id);
}

/** Strata open one by one: the next opens when the one below it has been cleared. */
export function unlockedStrata(p: Profile, total: number): number {
  let n = 1;
  while (n < total && (p.climb.strata[String(n - 1)]?.clears ?? 0) > 0) n++;
  return n;
}

/** What a climb needs from the profile. */
export function climbStart(p: Profile, o: { seed: string; daily: string | null; stratum: number; hero?: string }): StartClimb {
  const hero = o.hero ?? p.hero;
  if (!p.collection.heroes[hero]) throw new Error(`Not an owned hero: ${hero}`);
  return {
    seed: o.seed,
    daily: o.daily,
    stratum: o.stratum,
    hero,
    resonance: p.collection.heroes[hero]!.resonance,
    rank: p.rank,
    kindled: Object.fromEntries(Object.entries(p.collection.cards).filter(([, n]) => n > 0)),
    archive: p.archive,
  };
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

/** Feed a finished fight into the daily tasks. */
export function recordFight(p: Profile, stats: CardBattleStats, victory: boolean, kind: NodeKind, now: number): TaskCompletion[] {
  const big = kind === 'elite' || kind === 'guardian' || kind === 'boss';
  return [
    ...recordEvent(p, 'wins', victory ? 1 : 0, now),
    ...recordEvent(p, 'breaks', stats.breaks, now),
    ...recordEvent(p, 'chains', stats.chains, now),
    ...recordEvent(p, 'ultimates', stats.ultimates, now),
    ...recordEvent(p, 'elites', victory && big ? 1 : 0, now),
  ];
}

// ---------------------------------------------------------------------------
// Settling a climb
// ---------------------------------------------------------------------------

export interface ClimbSettlement {
  floorGloam: number;
  clearGloam: number;
  dailyGloam: number;
  weeklyGloam: number;
  xp: number;
  ranksGained: number;
  rankGloam: number;
  tasks: TaskCompletion[];
}

/** Pay out a finished climb, record it, and clear it from the profile. */
export function settleClimb(p: Profile, run: ClimbRun, now: number): ClimbSettlement {
  const rewards = climbRewards(run);
  const cleared = run.result === 'cleared';
  const floorGloam = grantGloam(p, 'climbFloor', rewards.floorGloam, now);
  const clearGloam = grantGloam(p, 'climbFloor', rewards.clearGloam, now);

  let dailyGloam = 0;
  let weeklyGloam = 0;
  if (cleared && run.daily && !p.climb.dailyClears.includes(run.daily)) {
    p.climb.dailyClears = [...p.climb.dailyClears, run.daily].slice(-14);
    dailyGloam = grantGloam(p, 'climbDaily', DAILY_GLOAM, now);
    const thisWeek = weekKey(now);
    const daysThisWeek = p.climb.dailyClears.filter((d) => weekKey(Date.parse(`${d}T12:00:00Z`)) === thisWeek).length;
    if (daysThisWeek >= WEEKLY_MILESTONE_DAYS && p.climb.weeklyMilestone !== thisWeek) {
      p.climb.weeklyMilestone = thisWeek;
      weeklyGloam = grantGloam(p, 'climbWeekly', WEEKLY_MILESTONE_GLOAM, now);
    }
  }

  const up = addXp(p, rewards.xp, now);
  const tasks = recordEvent(p, 'floors', run.stats.floorsCleared, now);
  const key = String(run.stratum);
  const rec = p.climb.strata[key] ?? { clears: 0, reached: 0 };
  rec.reached = Math.max(rec.reached, run.stats.reachedFloor);
  if (cleared) rec.clears++;
  p.climb.strata[key] = rec;
  p.climb.runs++;
  p.climb.run = null;
  p.updatedAt = now;
  return { floorGloam, clearGloam, dailyGloam, weeklyGloam, xp: rewards.xp, ranksGained: up.ranksGained, rankGloam: up.gloam, tasks };
}


// ---------------------------------------------------------------------------
// Story beats
// ---------------------------------------------------------------------------

function triggered(p: Profile, b: BeatDef): boolean {
  const t = b.trigger;
  switch (t.type) {
    case 'start':
      return true;
    case 'firstClimbEnd':
      return p.climb.runs >= 1;
    case 'reachFloor':
      return (p.climb.strata[String(t.stratum)]?.reached ?? -1) >= t.floor;
    case 'clearStratum':
      return (p.climb.strata[String(t.stratum)]?.clears ?? 0) >= 1;
  }
}

/** Story scenes that are ready to be seen, in story order. */
export function dueBeats(p: Profile, beats: readonly BeatDef[]): BeatDef[] {
  return beats.filter((b) => !p.progress.beats.includes(b.id) && triggered(p, b));
}

export interface BeatReward {
  gloam: number;
  unlocked: string[];
}

/** Mark a scene as seen: it pays its Gloam once and brings its heroes into the crew. */
export function seeBeat(p: Profile, b: BeatDef, now: number): BeatReward {
  if (p.progress.beats.includes(b.id)) return { gloam: 0, unlocked: [] };
  p.progress.beats.push(b.id);
  const gloam = b.gloam ? grantGloam(p, 'story', b.gloam, now) : 0;
  const unlocked: string[] = [];
  for (const id of b.unlocks ?? []) {
    if (!p.collection.heroes[id]) {
      p.collection.heroes[id] = { resonance: 1 };
      unlocked.push(id);
    }
  }
  p.updatedAt = now;
  return { gloam, unlocked };
}

// ---------------------------------------------------------------------------
// Feature gates
// ---------------------------------------------------------------------------

export type Feature = 'kindling' | 'roster' | 'tasks' | 'daily';

/** Features open up as the story teaches them. */
export function isUnlocked(p: Profile, feature: Feature): boolean {
  switch (feature) {
    case 'kindling':
    case 'roster':
    case 'tasks':
      return p.progress.flags['firstKindling'] === true;
    case 'daily':
      return p.climb.runs >= 1;
  }
}

/** The week a day key falls in, for the weekly milestone display. */
export const weekOfDay = (day: string): string => weekKey(Date.parse(`${day}T12:00:00Z`));
