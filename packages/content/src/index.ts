import type { CardDef, EncounterDef, EnemyDef, HeroDef, ItemCatalog, StageDef } from '@duskline/core';
import { CARDS } from './cards';
import { ENEMIES } from './enemies';
import { HEROES } from './heroes';
import { ENCOUNTERS, STAGES } from './stages';

export const CONTENT_VERSION = '0.1.0';

export { CARDS, ENCOUNTERS, ENEMIES, HEROES, STAGES };
export * from './banners';
export { DESCENT_ENCOUNTERS, DESCENT_POOLS, descentDeps } from './descent';
export { GLIMMERS } from './glimmers';
export { ownedHeroIdsBefore, rankBefore } from './progress';

export { FIRST_KINDLING_HERO, STARTER_HEROES } from './constants';
const heroMap = new Map<string, HeroDef>(HEROES.map((h) => [h.id, h]));
const cardMap = new Map<string, CardDef>(CARDS.map((c) => [c.id, c]));
const enemyMap = new Map<string, EnemyDef>(ENEMIES.map((e) => [e.id, e]));
const encounterMap = new Map<string, EncounterDef>(ENCOUNTERS.map((e) => [e.id, e]));
const stageMap = new Map<string, StageDef>(STAGES.map((s) => [s.id, s]));

function need<T>(map: Map<string, T>, id: string, what: string): T {
  const v = map.get(id);
  if (!v) throw new Error(`Unknown ${what}: ${id}`);
  return v;
}

export const heroById = (id: string): HeroDef | undefined => heroMap.get(id);
export const cardById = (id: string): CardDef | undefined => cardMap.get(id);
export const enemyById = (id: string): EnemyDef | undefined => enemyMap.get(id);
export const stageById = (id: string): StageDef | undefined => stageMap.get(id);

export const requireHero = (id: string): HeroDef => need(heroMap, id, 'hero');
export const requireCard = (id: string): CardDef => need(cardMap, id, 'card');
export const requireEnemy = (id: string): EnemyDef => need(enemyMap, id, 'enemy');
export const requireEncounter = (id: string): EncounterDef => need(encounterMap, id, 'encounter');
export const requireStage = (id: string): StageDef => need(stageMap, id, 'stage');

/** Tells the Kindling code what an item id is. */
export const catalog: ItemCatalog = (id) => {
  const hero = heroMap.get(id);
  if (hero) return { kind: 'hero', rarity: hero.rarity };
  const card = cardMap.get(id);
  if (card) return { kind: 'card', rarity: card.rarity };
  return undefined;
};

/** Heroes that can only be won from Kindling. */
export const AFTERLIGHTS: readonly HeroDef[] = HEROES.filter((h) => h.origin === 'afterlight');
export const STORY_HEROES: readonly HeroDef[] = HEROES.filter((h) => h.origin === 'story');
