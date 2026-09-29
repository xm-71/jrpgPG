import type { DescentDeps, DescentPools, EncounterDef } from '@duskline/core';
import { CARDS } from './cards';
import { ENEMIES } from './enemies';
import { GLIMMERS } from './glimmers';
import { HEROES } from './heroes';
import { ENCOUNTERS } from './stages';

/**
 * Encounters for the Descent. They reuse the campaign's Fades in new mixes, with HP multipliers
 * so a run of several fights stays quick. Bosses are the floor's finale.
 */
export const DESCENT_ENCOUNTERS: readonly EncounterDef[] = [
  { id: 'dn.wisps', name: 'A Swarm of Wisps', foes: [{ enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }, { enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }, { enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }] },
  { id: 'dn.hounds', name: 'Hounds and a Hymn', foes: [{ enemy: 'hound', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'choir', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'hound', hpMult: 0.56, atkMult: 0.9 }] },
  { id: 'dn.wraiths', name: 'Two Wraiths and a Hound', foes: [{ enemy: 'wraith', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'hound', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'wraith', hpMult: 0.56, atkMult: 0.9 }] },
  { id: 'dn.mixed', name: 'Lost and Loud', foes: [{ enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }, { enemy: 'wraith', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'choir', hpMult: 0.56, atkMult: 0.9 }] },
  { id: 'dn.husk', name: 'The Door Again', foes: [{ enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }, { enemy: 'husk', hpMult: 0.49, atkMult: 0.9 }, { enemy: 'wisp', hpMult: 0.63, atkMult: 0.9 }] },
  { id: 'dn.pack', name: 'A Whole Pack', foes: [{ enemy: 'hound', hpMult: 0.49, atkMult: 0.9 }, { enemy: 'wisp', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'wisp', hpMult: 0.56, atkMult: 0.9 }, { enemy: 'hound', hpMult: 0.49, atkMult: 0.9 }] },

  { id: 'dx.static', name: 'A Static Knight', foes: [{ enemy: 'hound', hpMult: 0.49, atkMult: 1.2 }, { enemy: 'static', hpMult: 0.49, atkMult: 1.2 }, { enemy: 'wisp', hpMult: 0.56, atkMult: 1.2 }] },
  { id: 'dx.chorus', name: 'The Signal Chorus', foes: [{ enemy: 'choir', hpMult: 0.49, atkMult: 1.2 }, { enemy: 'static', hpMult: 0.45, atkMult: 1.2 }, { enemy: 'choir', hpMult: 0.49, atkMult: 1.2 }] },
  { id: 'dx.husks', name: 'Doors and Static', foes: [{ enemy: 'husk', hpMult: 0.33, atkMult: 1.2 }, { enemy: 'static', hpMult: 0.4, atkMult: 1.2 }, { enemy: 'husk', hpMult: 0.33, atkMult: 1.2 }] },

  { id: 'db.1', name: 'The Signal Keeper', foes: [{ enemy: 'wisp', hpMult: 0.56, atkMult: 1.3 }, { enemy: 'static', hpMult: 0.56, atkMult: 1.3 }, { enemy: 'wisp', hpMult: 0.56, atkMult: 1.3 }] },
  { id: 'db.2', name: 'The Coat-Tower', foes: [{ enemy: 'hound', hpMult: 0.49, atkMult: 1.3 }, { enemy: 'husk', hpMult: 0.52, atkMult: 1.3 }, { enemy: 'choir', hpMult: 0.49, atkMult: 1.3 }] },
  { id: 'db.3', name: 'The Umbral Warden', foes: [{ enemy: 'choir', levelOffset: -1, hpMult: 0.49, atkMult: 1.3 }, { enemy: 'warden', hpMult: 0.49, atkMult: 1.3 }, { enemy: 'choir', levelOffset: -1, hpMult: 0.49, atkMult: 1.3 }] },
];

export const DESCENT_POOLS: DescentPools = {
  normal: ['dn.wisps', 'dn.hounds', 'dn.wraiths', 'dn.mixed', 'dn.husk', 'dn.pack'],
  elite: ['dx.static', 'dx.chorus', 'dx.husks'],
  boss: ['db.1', 'db.2', 'db.3'],
};

const heroMap = new Map(HEROES.map((h) => [h.id, h]));
const cardMap = new Map(CARDS.map((c) => [c.id, c]));
const enemyMap = new Map(ENEMIES.map((e) => [e.id, e]));
const encounterMap = new Map([...ENCOUNTERS, ...DESCENT_ENCOUNTERS].map((e) => [e.id, e]));
const glimmerMap = new Map(GLIMMERS.map((g) => [g.id, g]));

function need<T>(map: Map<string, T>, id: string, what: string): T {
  const v = map.get(id);
  if (!v) throw new Error(`Unknown ${what}: ${id}`);
  return v;
}

/** Everything the Descent logic in core needs to look up. */
export const descentDeps: DescentDeps = {
  hero: (id) => need(heroMap, id, 'hero'),
  card: (id) => cardMap.get(id),
  enemy: (id) => need(enemyMap, id, 'enemy'),
  encounter: (id) => need(encounterMap, id, 'encounter'),
  glimmer: (id) => need(glimmerMap, id, 'glimmer'),
  glimmers: () => GLIMMERS,
  pools: DESCENT_POOLS,
};
