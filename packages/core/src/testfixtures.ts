import type { CardDef, EncounterDef, EnemyDef, HeroDef } from './data';
import type { GlimmerDef } from './descent';
import type { ItemCatalog } from './kindling';
import { foe, hero } from './battle/testkit';
import type { Affinity } from './types';

/** Small hand-made data for core tests, so core never depends on the content package. */

function heroDef(id: string, affinity: Affinity, rarity: 4 | 5 = 4, origin: HeroDef['origin'] = 'story'): HeroDef {
  const u = hero(id, { affinity });
  return {
    id,
    name: id[0]!.toUpperCase() + id.slice(1),
    title: 'Test hero',
    origin,
    rarity,
    role: 'striker',
    affinity,
    base: u.stats,
    kit: u.kit!,
    blurb: 'A hero made for tests.',
    quote: 'Testing.',
    look: { height: 1, hair: 'short', hairColor: '#000000', skin: '#ffffff', outfit: '#000000', accent: '#ffffff', prop: 'blade' },
  };
}

export const HERO_DEFS: HeroDef[] = [
  heroDef('wren', 'sun'),
  heroDef('marisol', 'volt'),
  heroDef('io', 'moon', 5),
  heroDef('pip', 'gale'),
  heroDef('tamsin', 'frost'),
  heroDef('ysolde', 'frost', 5, 'afterlight'),
];

export const CARD_DEFS: CardDef[] = [
  { id: 'card.worn-lantern', name: 'Worn Lantern', rarity: 3, blurb: 'Test card.', passives: [{ type: 'stat', stat: 'hp', pct: 0.06 }], art: { hue: 30, glyph: 'lantern' } },
  { id: 'card.ledger', name: 'Ledger', rarity: 4, blurb: 'Test card.', passives: [{ type: 'encoreDamage', value: 0.12 }], art: { hue: 300, glyph: 'ledger' } },
];

const enemy = (id: string, weaknesses: Affinity[], tier: EnemyDef['tier'] = 'mob'): EnemyDef => {
  const u = foe(id, { weaknesses, hp: tier === 'mob' ? 400 : 900, shell: tier === 'mob' ? 2 : 4 });
  return { id, name: id, family: 'wisp', tier, base: u.stats, shell: u.shell!, weaknesses, resists: [], foeKit: u.foeKit!, blurb: 'A foe made for tests.', scale: 1 };
};

export const ENEMY_DEFS: EnemyDef[] = [
  enemy('e-sun', ['sun']),
  enemy('e-volt', ['volt']),
  enemy('e-moon', ['moon']),
  enemy('e-elite', ['gale'], 'elite'),
  enemy('e-boss', ['frost'], 'boss'),
];

export const ENCOUNTER_DEFS: EncounterDef[] = [
  { id: 'n1', name: 'One', foes: [{ enemy: 'e-sun' }, { enemy: 'e-volt' }] },
  { id: 'n2', name: 'Two', foes: [{ enemy: 'e-moon' }, { enemy: 'e-sun' }] },
  { id: 'n3', name: 'Three', foes: [{ enemy: 'e-volt' }, { enemy: 'e-moon' }] },
  { id: 'x1', name: 'Elite', foes: [{ enemy: 'e-elite' }, { enemy: 'e-sun' }] },
  { id: 'b1', name: 'Boss One', foes: [{ enemy: 'e-boss', hpMult: 0.6 }] },
  { id: 'b2', name: 'Boss Two', foes: [{ enemy: 'e-boss', hpMult: 0.6 }] },
  { id: 'b3', name: 'Boss Three', foes: [{ enemy: 'e-boss', hpMult: 0.6 }] },
];

export const GLIMMER_DEFS: GlimmerDef[] = [
  { id: 'g-atk', name: 'Sunstruck', path: 'noonward', rarity: 1, text: 'ATK up.', passives: [{ type: 'stat', stat: 'atk', pct: 0.1 }] },
  { id: 'g-burst', name: 'Long Shadows', path: 'noonward', rarity: 2, text: 'Burst up.', passives: [{ type: 'burstDamage', value: 0.25 }] },
  { id: 'g-lantern', name: 'Deep Breath', path: 'duskward', rarity: 1, text: 'Lantern up.', passives: [{ type: 'startLantern', value: 1 }] },
  { id: 'g-spd', name: 'Quickening', path: 'duskward', rarity: 2, text: 'SPD up.', passives: [{ type: 'stat', stat: 'spd', pct: 0.08 }] },
  { id: 'g-def', name: 'Iron Lantern', path: 'nightward', rarity: 1, text: 'DEF up.', passives: [{ type: 'stat', stat: 'def', pct: 0.12 }] },
  { id: 'g-hp', name: 'Hearthglow', path: 'nightward', rarity: 2, text: 'HP up.', passives: [{ type: 'stat', stat: 'hp', pct: 0.12 }] },
  { id: 'g-gauge', name: 'Overture', path: 'noonward', rarity: 3, text: 'Gauge up.', passives: [{ type: 'startGauge', value: 30 }] },
];

const heroes = new Map(HERO_DEFS.map((h) => [h.id, h]));
const cards = new Map(CARD_DEFS.map((c) => [c.id, c]));
const enemies = new Map(ENEMY_DEFS.map((e) => [e.id, e]));
const encounters = new Map(ENCOUNTER_DEFS.map((e) => [e.id, e]));
const glimmers = new Map(GLIMMER_DEFS.map((g) => [g.id, g]));

const need = <T>(m: Map<string, T>, id: string): T => {
  const v = m.get(id);
  if (!v) throw new Error(`fixture missing: ${id}`);
  return v;
};

export const lookup: ItemCatalog = (id) => {
  const h = heroes.get(id);
  if (h) return { kind: 'hero', rarity: h.rarity };
  const c = cards.get(id);
  return c ? { kind: 'card', rarity: c.rarity } : undefined;
};

export const partyDeps = { hero: (id: string) => need(heroes, id), card: (id: string) => cards.get(id) };

export const descentDeps = {
  hero: (id: string) => need(heroes, id),
  card: (id: string) => cards.get(id),
  enemy: (id: string) => need(enemies, id),
  encounter: (id: string) => need(encounters, id),
  glimmer: (id: string) => need(glimmers, id),
  glimmers: () => GLIMMER_DEFS,
  pools: { normal: ['n1', 'n2', 'n3'], elite: ['x1'], boss: ['b1', 'b2', 'b3'] },
};
