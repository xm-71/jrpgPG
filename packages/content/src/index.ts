import type { BeatDef, CardDef, ClimbDeps, EncounterDef, EventDef, FoeDef, GlimmerDef, HeroDef, ItemCatalog, StratumDef } from '@duskline/core';
import { BASICS, BOUND, KINDLED, POOL } from './cards';
import { EVENTS } from './events';
import { FOES } from './foes';
import { GLIMMERS } from './glimmers';
import { HERO_CARDS, HEROES } from './heroes';
import { BEATS } from './story';
import { ENCOUNTERS, STRATA } from './strata';

export const CONTENT_VERSION = '0.2.0';

/** Every card in the game except Echoes, which are made during climbs. */
export const CARDS: readonly CardDef[] = [...BASICS, ...POOL, ...KINDLED, ...BOUND, ...HERO_CARDS];

export { BASICS, BEATS, BOUND, ENCOUNTERS, EVENTS, FOES, GLIMMERS, HERO_CARDS, HEROES, KINDLED, POOL, STRATA };
export * from './banners';
export { FIRST_KINDLING_HERO, STARTER_HEROES } from './constants';
export { AFFINITY_HUE } from './helpers';

function index<T extends { id: string }>(list: readonly T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}

const heroMap = index(HEROES);
const cardMap = index(CARDS);
const foeMap = index(FOES);
const encounterMap = index(ENCOUNTERS);
const eventMap = index(EVENTS);
const glimmerMap = index(GLIMMERS);
const beatMap = index(BEATS);

function need<T>(map: Map<string, T>, id: string, what: string): T {
  const v = map.get(id);
  if (!v) throw new Error(`Unknown ${what}: ${id}`);
  return v;
}

export const heroById = (id: string): HeroDef | undefined => heroMap.get(id);
export const cardById = (id: string): CardDef | undefined => cardMap.get(id);
export const foeById = (id: string): FoeDef | undefined => foeMap.get(id);
export const beatById = (id: string): BeatDef | undefined => beatMap.get(id);

export const requireHero = (id: string): HeroDef => need(heroMap, id, 'hero');
export const requireCard = (id: string): CardDef => need(cardMap, id, 'card');
export const requireFoe = (id: string): FoeDef => need(foeMap, id, 'foe');
export const requireEncounter = (id: string): EncounterDef => need(encounterMap, id, 'encounter');
export const requireEvent = (id: string): EventDef => need(eventMap, id, 'event');
export const requireGlimmer = (id: string): GlimmerDef => need(glimmerMap, id, 'glimmer');
export function requireStratum(index: number): StratumDef {
  const s = STRATA[index];
  if (!s) throw new Error(`Unknown stratum: ${index}`);
  return s;
}

/** Everything the climb rules in core look up. */
export const climbDeps: ClimbDeps = {
  hero: requireHero,
  card: cardById,
  foe: requireFoe,
  encounter: requireEncounter,
  glimmer: requireGlimmer,
  glimmers: () => GLIMMERS,
  event: requireEvent,
  stratum: requireStratum,
  pool: () => POOL,
};

/** Tells the Kindling code what an item id is. */
export const catalog: ItemCatalog = (id) => {
  const hero = heroMap.get(id);
  if (hero) return { kind: 'hero', rarity: hero.rarity };
  const card = cardMap.get(id);
  if (card?.stars) return { kind: 'card', rarity: card.stars };
  return undefined;
};

/** Heroes that can only be won from Kindling. */
export const AFTERLIGHTS: readonly HeroDef[] = HEROES.filter((h) => h.origin === 'afterlight');
export const STORY_HEROES: readonly HeroDef[] = HEROES.filter((h) => h.origin === 'story');
