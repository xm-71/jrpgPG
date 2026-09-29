import type { HeroDef } from '@duskline/core';
import { basicAttack, skill, ultimate } from './helpers';

/**
 * The launch cast. Six story heroes join through the campaign for free.
 * Six Afterlights, people from earlier Turnings, come from Kindling.
 */

// ---------------------------------------------------------------------------
// Story heroes
// ---------------------------------------------------------------------------

const wren: HeroDef = {
  id: 'wren',
  name: 'Wren',
  title: 'Apprentice Lamplighter',
  origin: 'story',
  rarity: 4,
  role: 'support',
  affinity: 'sun',
  base: { hp: 720, atk: 92, def: 45, spd: 100 },
  kit: {
    basic: basicAttack({ id: 'wren.basic', name: 'Lantern Swing', affinity: 'sun', blurb: 'A swing of the lamp. Builds Lantern.' }),
    skill: skill({
      id: 'wren.skill',
      name: 'Rekindle',
      affinity: 'sun',
      power: 0.8,
      shell: 2,
      blurb: 'Strike with the flame and lift the whole crew: party ATK up for 2 turns.',
      effects: [{ type: 'mod', on: 'party', stat: 'atk', pct: 0.15, turns: 2 }],
    }),
    ultimate: ultimate({
      id: 'wren.ult',
      name: 'Dawn Toll',
      affinity: 'sun',
      target: 'allEnemies',
      power: 1.4,
      shell: 2,
      blurb: 'A bell of borrowed morning. Hits every enemy and heals the party a little.',
      effects: [{ type: 'heal', on: 'party', of: 'maxHp', scale: 0.15 }],
    }),
  },
  blurb: "Vesper's youngest Lamplighter. Wren can coax a Gloamstone awake, which is either a gift or a problem depending on who is asking.",
  quote: 'Hold the light steady. Everything else can shake.',
  look: { height: 0.96, hair: 'short', hairColor: '#6B4330', skin: '#F1C9A5', outfit: '#E0457B', accent: '#F2B43A', prop: 'lantern' },
};

const io: HeroDef = {
  id: 'io',
  name: 'Io',
  title: 'The First Afterlight',
  origin: 'story',
  rarity: 5,
  role: 'striker',
  affinity: 'moon',
  base: { hp: 640, atk: 118, def: 38, spd: 108 },
  kit: {
    basic: basicAttack({ id: 'io.basic', name: 'Moon Cut', affinity: 'moon', blurb: 'A quick crescent slash.' }),
    skill: skill({
      id: 'io.skill',
      name: 'Old Turning',
      affinity: 'moon',
      power: 2.1,
      shell: 2,
      blurb: 'A heavy cut from an age that no longer exists.',
    }),
    ultimate: ultimate({
      id: 'io.ult',
      name: 'First Turning',
      affinity: 'moon',
      power: 4.6,
      shell: 3,
      blurb: 'The world turns once, just for her. One enemy takes all of it.',
    }),
  },
  turning: 'The First Turning',
  blurb: 'A girl from the very first Turning, when the world still moved. She remembers a sunrise and cannot make anyone believe her.',
  quote: 'You call it the Stillness. I call it a very long afternoon.',
  look: { height: 1.0, hair: 'long', hairColor: '#DCD6F0', skin: '#F4E2D6', outfit: '#3B2E7E', accent: '#2BB5A6', prop: 'blade', cape: true },
};

const marisol: HeroDef = {
  id: 'marisol',
  name: 'Marisol Vey',
  title: 'Captain of Vesper',
  origin: 'story',
  rarity: 4,
  role: 'defender',
  affinity: 'volt',
  base: { hp: 960, atk: 84, def: 70, spd: 92 },
  kit: {
    basic: basicAttack({ id: 'marisol.basic', name: 'Rail Jab', affinity: 'volt', blurb: 'A short, mean jab with the deck rail.' }),
    skill: skill({
      id: 'marisol.skill',
      name: 'Storm Ward',
      affinity: 'volt',
      target: 'allEnemies',
      power: 0.6,
      shell: 1,
      gauge: 12,
      blurb: 'Crackling sweep. Enemies target her for 2 turns.',
      effects: [{ type: 'taunt', turns: 2 }],
    }),
    ultimate: ultimate({
      id: 'marisol.ult',
      name: 'Thunder Anchor',
      affinity: 'volt',
      target: 'allEnemies',
      power: 1.6,
      shell: 3,
      blurb: 'Drops the anchor on the whole field. She draws fire and the crew tightens up.',
      effects: [
        { type: 'taunt', turns: 2 },
        { type: 'mod', on: 'party', stat: 'def', pct: 0.2, turns: 2 },
      ],
    }),
  },
  blurb: 'Captain of the oldest, smallest Strider on the Duskline. She keeps the crew fed, the legs oiled, and the secrets to herself.',
  quote: 'Nobody gets left behind on my deck. Not even the ones who deserve it.',
  look: { height: 1.08, hair: 'ponytail', hairColor: '#1D1A2F', skin: '#C98E64', outfit: '#C77B2C', accent: '#F2D24A', prop: 'rail', cape: true },
};

const tamsin: HeroDef = {
  id: 'tamsin',
  name: 'Tamsin',
  title: 'Hushborn Scout',
  origin: 'story',
  rarity: 4,
  role: 'debuffer',
  affinity: 'frost',
  base: { hp: 620, atk: 88, def: 40, spd: 112 },
  kit: {
    basic: basicAttack({ id: 'tamsin.basic', name: 'Star Needle', affinity: 'frost', blurb: 'A thrown sliver of starlight ice.' }),
    skill: skill({
      id: 'tamsin.skill',
      name: 'Constellation Bind',
      affinity: 'frost',
      power: 0.9,
      shell: 2,
      blurb: 'Pins an enemy to the sky: DEF down for 2 turns and its next turn comes later.',
      effects: [
        { type: 'mod', on: 'targets', stat: 'def', pct: -0.25, turns: 2 },
        { type: 'delay', on: 'targets', pct: 0.2 },
      ],
    }),
    ultimate: ultimate({
      id: 'tamsin.ult',
      name: 'Long Night',
      affinity: 'frost',
      target: 'allEnemies',
      power: 1.2,
      shell: 2,
      blurb: 'Night falls on the field. Every enemy slows and loses DEF for 3 turns.',
      effects: [
        { type: 'mod', on: 'foes', stat: 'def', pct: -0.2, turns: 3 },
        { type: 'delay', on: 'foes', pct: 0.3 },
      ],
    }),
  },
  blurb: 'A scout from the night side whose glowing tattoos map the stars from before the Stillness. She trusts stars more than people.',
  quote: 'The sky moved once. My skin remembers.',
  look: { height: 1.02, hair: 'bob', hairColor: '#123044', skin: '#D9B79C', outfit: '#2C3F86', accent: '#43D3C3', prop: 'needle' },
};

const aurelian: HeroDef = {
  id: 'aurelian',
  name: 'Aurelian',
  title: 'Knight of the Meridian Dominion',
  origin: 'story',
  rarity: 4,
  role: 'burst',
  affinity: 'flame',
  base: { hp: 700, atk: 112, def: 48, spd: 96 },
  kit: {
    basic: basicAttack({ id: 'aurelian.basic', name: 'Dominion Blade', affinity: 'flame', blurb: 'A clean, formal cut. Builds Lantern.' }),
    skill: skill({
      id: 'aurelian.skill',
      name: 'Solar Cleave',
      affinity: 'flame',
      target: 'allEnemies',
      power: 1.0,
      shell: 1,
      blurb: 'A wide arc of noon fire across the whole field.',
    }),
    ultimate: ultimate({
      id: 'aurelian.ult',
      name: 'Meridian Verdict',
      affinity: 'flame',
      power: 5.2,
      shell: 3,
      blurb: 'The Dominion’s final ruling, delivered to one enemy.',
    }),
  },
  blurb: 'A Dominion knight who followed orders until the orders reached Vesper. Formal, fair, and quietly furious with himself.',
  quote: 'I was taught the Stillness was mercy. Mercy should not look like this.',
  look: { height: 1.12, hair: 'short', hairColor: '#E7B75A', skin: '#EBC9A2', outfit: '#F4F1F8', accent: '#F2B43A', prop: 'greatsword', cape: true },
};

const pip: HeroDef = {
  id: 'pip',
  name: 'Pip',
  title: 'Salvager',
  origin: 'story',
  rarity: 4,
  role: 'healer',
  affinity: 'gale',
  base: { hp: 640, atk: 80, def: 42, spd: 110 },
  kit: {
    basic: basicAttack({ id: 'pip.basic', name: 'Kite Snap', affinity: 'gale', blurb: 'The clockwork kite snaps at an enemy.' }),
    skill: skill({
      id: 'pip.skill',
      name: 'Windfall Patch',
      affinity: null,
      target: 'ally',
      power: 0,
      shell: 0,
      gauge: 10,
      blurb: 'Patches up an ally for 30% of their max HP and gets them moving sooner.',
      effects: [
        { type: 'heal', on: 'targets', of: 'maxHp', scale: 0.3 },
        { type: 'advance', on: 'targets', pct: 0.15 },
      ],
    }),
    ultimate: ultimate({
      id: 'pip.ult',
      name: 'Clockwork Gale',
      affinity: 'gale',
      target: 'allEnemies',
      power: 1.0,
      shell: 2,
      blurb: 'The kite whirls up a gale that hits every enemy, heals the party and charges ultimates.',
      effects: [
        { type: 'heal', on: 'party', of: 'maxHp', scale: 0.2 },
        { type: 'gauge', on: 'party', amount: 10 },
      ],
    }),
  },
  blurb: "Salvage kid with a clockwork kite and a talent for being where the falling things land. Everyone's little sibling, whether they like it or not.",
  quote: "If it's broken, I can fix it. If it's not broken, I can improve it until it is.",
  look: { height: 0.86, hair: 'spiky', hairColor: '#7BD3B5', skin: '#E8B98F', outfit: '#3E8F86', accent: '#F28A3A', prop: 'kite' },
};

// ---------------------------------------------------------------------------
// Afterlights
// ---------------------------------------------------------------------------

const ysolde: HeroDef = {
  id: 'ysolde',
  name: 'Ysolde Marrow',
  title: 'The Tidewarden',
  origin: 'afterlight',
  rarity: 5,
  role: 'defender',
  affinity: 'frost',
  base: { hp: 1040, atk: 82, def: 76, spd: 94 },
  kit: {
    basic: basicAttack({ id: 'ysolde.basic', name: 'Buoy Strike', affinity: 'frost', blurb: 'Swings the old lantern buoy.' }),
    skill: skill({
      id: 'ysolde.skill',
      name: 'Tidewall',
      affinity: null,
      target: 'allAllies',
      power: 0,
      shell: 0,
      gauge: 10,
      blurb: 'Raises a wall of cold water: party DEF up for 2 turns and a little healing.',
      effects: [
        { type: 'mod', on: 'party', stat: 'def', pct: 0.25, turns: 2 },
        { type: 'heal', on: 'party', of: 'maxHp', scale: 0.08 },
      ],
    }),
    ultimate: ultimate({
      id: 'ysolde.ult',
      name: 'Drowned Lantern',
      affinity: 'frost',
      target: 'allEnemies',
      power: 1.3,
      shell: 2,
      blurb: 'A lantern from the bottom of a forgotten sea. She draws fire and the party hardens.',
      effects: [
        { type: 'taunt', turns: 2 },
        { type: 'mod', on: 'party', stat: 'def', pct: 0.3, turns: 3 },
        { type: 'heal', on: 'party', of: 'maxHp', scale: 0.12 },
      ],
    }),
  },
  turning: 'The Turning of Warm Seas',
  blurb: 'She kept the lantern-buoys that guided ships home when the sea still moved. She kept them lit for a thousand years after the sea forgot.',
  quote: 'Follow the light. It has never once lied to me.',
  look: { height: 1.1, hair: 'long', hairColor: '#B7E2F0', skin: '#E6D3C6', outfit: '#1F5F86', accent: '#8FE3F5', prop: 'lantern', cape: true },
};

const kestrel: HeroDef = {
  id: 'kestrel',
  name: 'Kestrel Onwe',
  title: 'The Last Cartographer',
  origin: 'afterlight',
  rarity: 5,
  role: 'breaker',
  affinity: 'gale',
  base: { hp: 620, atk: 116, def: 36, spd: 124 },
  kit: {
    basic: basicAttack({ id: 'kestrel.basic', name: 'Compass Cut', affinity: 'gale', gauge: 12, blurb: 'A precise, fast cut.' }),
    skill: skill({
      id: 'kestrel.skill',
      name: 'Bearing Shot',
      affinity: 'gale',
      power: 1.6,
      shell: 3,
      timeCost: 0.8,
      blurb: 'A pinpoint shot that cracks Shell wide open and lets her act sooner.',
    }),
    ultimate: ultimate({
      id: 'kestrel.ult',
      name: 'True North',
      affinity: 'gale',
      target: 'allEnemies',
      power: 2.2,
      shell: 3,
      blurb: 'Every line on her map points at the enemy. Hits everyone hard.',
    }),
  },
  turning: 'The Turning of Roads',
  blurb: 'The last person to map a world that stayed the same for a whole lifetime. Her maps are now wrong in every way she is grateful for.',
  quote: 'North is a habit. I will teach you a better one.',
  look: { height: 1.04, hair: 'ponytail', hairColor: '#C46A3C', skin: '#D8A57F', outfit: '#3F6B4F', accent: '#F2D07A', prop: 'compass' },
};

const sable: HeroDef = {
  id: 'sable',
  name: 'Sable Ardent',
  title: 'The Choirmaster',
  origin: 'afterlight',
  rarity: 5,
  role: 'support',
  affinity: 'sun',
  base: { hp: 700, atk: 90, def: 44, spd: 106 },
  kit: {
    basic: basicAttack({ id: 'sable.basic', name: 'Hymn Note', affinity: 'sun', blurb: 'A ringing note of light.' }),
    skill: skill({
      id: 'sable.skill',
      name: 'Canticle',
      affinity: null,
      target: 'allAllies',
      power: 0,
      shell: 0,
      gauge: 10,
      blurb: 'The whole party is healed and hits harder for 2 turns.',
      effects: [
        { type: 'heal', on: 'party', of: 'maxHp', scale: 0.14 },
        { type: 'mod', on: 'party', stat: 'atk', pct: 0.12, turns: 2 },
      ],
    }),
    ultimate: ultimate({
      id: 'sable.ult',
      name: 'Requiem for Noon',
      affinity: 'sun',
      target: 'allEnemies',
      power: 1.5,
      shell: 2,
      blurb: 'Her choir sings the sun back up. Hits every enemy and charges every ally’s ultimate.',
      effects: [
        { type: 'gauge', on: 'party', amount: 25 },
        { type: 'heal', on: 'party', of: 'maxHp', scale: 0.1 },
      ],
    }),
  },
  turning: 'The Choir Turning',
  blurb: 'Conducted a choir of ten thousand under a moving sun. Her baton remembers every voice.',
  quote: 'Everyone has a note. I just listen until I hear it.',
  look: { height: 1.06, hair: 'crown', hairColor: '#2A1E33', skin: '#B98462', outfit: '#F4E6C8', accent: '#E0457B', prop: 'staff', cape: true },
};

const brannoch: HeroDef = {
  id: 'brannoch',
  name: 'Brannoch Grey',
  title: 'The Ashmason',
  origin: 'afterlight',
  rarity: 4,
  role: 'defender',
  affinity: 'flame',
  base: { hp: 1000, atk: 86, def: 72, spd: 90 },
  kit: {
    basic: basicAttack({ id: 'brannoch.basic', name: 'Trowel Bash', affinity: 'flame', blurb: 'A heavy swing of the mason’s trowel.' }),
    skill: skill({
      id: 'brannoch.skill',
      name: 'Mortar Wall',
      affinity: null,
      target: 'self',
      power: 0,
      shell: 0,
      gauge: 14,
      blurb: 'Digs in. Enemies target him for 2 turns and his DEF rises.',
      effects: [
        { type: 'taunt', turns: 2 },
        { type: 'mod', on: 'self', stat: 'def', pct: 0.3, turns: 2 },
      ],
    }),
    ultimate: ultimate({
      id: 'brannoch.ult',
      name: 'Anchor Stone',
      affinity: 'flame',
      power: 3.0,
      shell: 3,
      blurb: 'The first stone of the Anchor, dropped on one enemy. He draws fire afterwards.',
      effects: [{ type: 'taunt', turns: 2 }],
    }),
  },
  turning: 'The Turning of Stone',
  blurb: 'Laid the first stones of the Anchor and has been quietly regretting its foundations ever since.',
  quote: 'A wall is a promise you make with your back.',
  look: { height: 1.16, hair: 'short', hairColor: '#7C7A86', skin: '#D2A582', outfit: '#5B4A44', accent: '#F26B3A', prop: 'trowel' },
};

const nim: HeroDef = {
  id: 'nim',
  name: 'Nim Calloway',
  title: 'The Wire-witch',
  origin: 'afterlight',
  rarity: 4,
  role: 'debuffer',
  affinity: 'volt',
  base: { hp: 610, atk: 92, def: 40, spd: 114 },
  kit: {
    basic: basicAttack({ id: 'nim.basic', name: 'Static Tap', affinity: 'volt', blurb: 'A crackle of borrowed current.' }),
    skill: skill({
      id: 'nim.skill',
      name: 'Crossed Wires',
      affinity: 'volt',
      power: 0.9,
      shell: 2,
      blurb: 'Scrambles an enemy: ATK down for 2 turns and its next turn comes later.',
      effects: [
        { type: 'mod', on: 'targets', stat: 'atk', pct: -0.25, turns: 2 },
        { type: 'delay', on: 'targets', pct: 0.15 },
      ],
    }),
    ultimate: ultimate({
      id: 'nim.ult',
      name: 'Blackout',
      affinity: 'volt',
      target: 'allEnemies',
      power: 1.2,
      shell: 2,
      blurb: 'Every wire goes dark at once. All enemies lose ATK for 3 turns and slow down.',
      effects: [
        { type: 'mod', on: 'foes', stat: 'atk', pct: -0.2, turns: 3 },
        { type: 'delay', on: 'foes', pct: 0.25 },
      ],
    }),
  },
  turning: 'The Turning of Signals',
  blurb: 'Strung wires between cities so people could speak across the world. Speaks to ghosts now, since the cities are gone.',
  quote: "Somebody's always listening. I make sure it's someone kind.",
  look: { height: 0.98, hair: 'spiky', hairColor: '#3B2E7E', skin: '#E2BE9E', outfit: '#2F2A55', accent: '#F2D24A', prop: 'wire' },
};

const ondrej: HeroDef = {
  id: 'ondrej',
  name: 'Ondrej Vale',
  title: 'The Night-porter',
  origin: 'afterlight',
  rarity: 4,
  role: 'breaker',
  affinity: 'moon',
  base: { hp: 680, atk: 96, def: 44, spd: 102 },
  kit: {
    basic: basicAttack({ id: 'ondrej.basic', name: 'Shuttered Lantern', affinity: 'moon', blurb: 'A swing of the covered lamp.' }),
    skill: skill({
      id: 'ondrej.skill',
      name: 'Pry Open',
      affinity: 'moon',
      power: 1.2,
      shell: 3,
      blurb: 'Pries at an enemy’s Shell with a crowbar of pure dark.',
    }),
    ultimate: ultimate({
      id: 'ondrej.ult',
      name: 'Dark of the Moon',
      affinity: 'moon',
      target: 'allEnemies',
      power: 1.4,
      shell: 3,
      blurb: 'The lamp opens, and there is only night. Cracks every enemy’s Shell.',
    }),
  },
  turning: 'The Long Night Turning',
  blurb: 'Carried lanterns for travelers through a night that lasted forty years. Does not sleep. Does not mind.',
  quote: 'Dark is only a door nobody has opened.',
  look: { height: 1.05, hair: 'hooded', hairColor: '#20223A', skin: '#CFA98B', outfit: '#2A2F4F', accent: '#9AA7FF', prop: 'orb', cape: true },
};

export const HEROES: readonly HeroDef[] = [wren, io, marisol, tamsin, aurelian, pip, ysolde, kestrel, sable, brannoch, nim, ondrej];
