import type { CardDef } from './cards/defs';
import { ASH_ID } from './cards/rules';
import { card } from './cards/testkit';
import type { ClimbDeps } from './climb/types';
import type { BeatDef, EncounterDef, EventDef, FoeDef, GlimmerDef, HeroDef, StratumDef } from './data';
import type { ItemCatalog } from './kindling';

/** Small hand-made data for core tests, so core never depends on the content package. */

const look: HeroDef['look'] = { height: 1, style: 'shonen', hair: 'spiky', hairColor: '#000000', skin: '#ffffff', eyes: '#000000', outfit: '#000000', under: '#ffffff', accent: '#ffffff', prop: 'blade', wear: [] };

export const CARD_DEFS: CardDef[] = [
  card('cut', { kind: 'strike', atk: 6, ward: 1, tier: 'basic', source: 'basic', plus: { atk: 9 } }),
  card('brace', { kind: 'guard', atk: 2, ward: 6, tier: 'basic', source: 'basic', plus: { ward: 9 } }),
  card('wren.sig', { kind: 'balanced', affinity: 'sun', atk: 5, ward: 3, tier: 'basic', source: 'hero', hero: 'wren', plus: { atk: 7 } }),
  card('wren.s2', { kind: 'strike', affinity: 'sun', atk: 8, ward: 1, tier: 'uncommon', source: 'hero', hero: 'wren' }),
  card('wren.ult', { kind: 'strike', cost: 0, affinity: 'sun', target: 'allFoes', atk: 12, ward: 0, tier: 'special', source: 'ultimate', keywords: ['fleeting'] }),
  card('io.sig', { kind: 'strike', affinity: 'moon', atk: 6, ward: 1, tier: 'basic', source: 'hero', hero: 'io' }),
  card('io.ult', { kind: 'strike', cost: 0, affinity: 'moon', atk: 20, ward: 0, tier: 'special', source: 'ultimate', keywords: ['fleeting'] }),
  card('p.c1', { kind: 'strike', affinity: 'flame', atk: 7, ward: 1, tier: 'common', plus: { atk: 10 } }),
  card('p.c2', { kind: 'guard', affinity: 'frost', atk: 2, ward: 8, tier: 'common' }),
  card('p.c3', { kind: 'balanced', affinity: 'volt', atk: 5, ward: 4, tier: 'common' }),
  card('p.u1', { kind: 'strike', affinity: 'gale', atk: 5, hits: 2, ward: 1, tier: 'uncommon' }),
  card('p.u2', { kind: 'rite', affinity: 'moon', atk: 0, ward: 2, tier: 'uncommon', effects: [{ type: 'status', status: 'hex', stacks: 2 }] }),
  card('p.r1', { kind: 'strike', cost: 2, affinity: 'sun', atk: 16, ward: 2, tier: 'rare' }),
  card('card.key', { kind: 'guard', atk: 3, ward: 7, tier: 'uncommon', source: 'kindling', stars: 4, plus: { ward: 10 } }),
  card('bound.wisp', { kind: 'strike', affinity: 'flame', atk: 4, ward: 1, tier: 'common', source: 'bound', effects: [{ type: 'status', status: 'burn', stacks: 2 }] }),
  card(ASH_ID, { kind: 'curse', cost: 0, atk: 0, ward: 0, tier: 'special', source: 'curse', keywords: ['unplayable'] }),
];

const STARTER = ['cut', 'cut', 'cut', 'brace', 'brace', 'brace', 'wren.sig', 'wren.sig'];

export const HERO_DEFS: HeroDef[] = [
  {
    id: 'wren',
    name: 'Wren',
    title: 'Test hero',
    origin: 'story',
    rarity: 4,
    role: 'support',
    affinity: 'sun',
    hp: 60,
    starter: STARTER,
    signature: ['wren.s2'],
    ultimate: 'wren.ult',
    trait: { name: 'Warm Hands', passives: [{ type: 'breakHeal', value: 2 }] },
    blurb: 'A hero made for tests.',
    quote: 'Testing.',
    look,
  },
  {
    id: 'io',
    name: 'Io',
    title: 'Test hero',
    origin: 'story',
    rarity: 5,
    role: 'striker',
    affinity: 'moon',
    hp: 55,
    starter: ['cut', 'cut', 'cut', 'brace', 'brace', 'brace', 'io.sig', 'io.sig'],
    signature: [],
    ultimate: 'io.ult',
    trait: { name: 'Old Light', passives: [{ type: 'damage', pct: 0.1 }] },
    blurb: 'A hero made for tests.',
    quote: 'Testing.',
    look,
  },
];

const bite = { id: 'bite', name: 'Bite', dmg: 4 };

export const FOE_DEFS: FoeDef[] = [
  { id: 'wisp', name: 'Wisp', family: 'wisp', tier: 'mob', hp: 16, shell: 2, weaknesses: ['sun', 'gale'], resists: [], moves: [bite], blurb: 'Test foe.', scale: 1, bind: 'bound.wisp' },
  {
    id: 'husk',
    name: 'Husk',
    family: 'husk',
    tier: 'elite',
    hp: 34,
    shell: 3,
    weaknesses: ['flame', 'sun'],
    resists: [],
    moves: [
      { id: 'slam', name: 'Slam', dmg: 7 },
      { id: 'brace', name: 'Brace', ward: 6 },
    ],
    pattern: ['slam', 'brace'],
    blurb: 'Test foe.',
    scale: 1,
  },
  {
    id: 'warden',
    name: 'Warden',
    family: 'warden',
    tier: 'boss',
    hp: 60,
    shell: 4,
    weaknesses: ['sun', 'moon'],
    resists: [],
    moves: [
      { id: 'toll', name: 'Toll', dmg: 6 },
      { id: 'hymn', name: 'Hymn', rage: 1, ward: 6 },
    ],
    pattern: ['toll', 'hymn'],
    blurb: 'Test foe.',
    scale: 1,
  },
];

export const ENCOUNTER_DEFS: EncounterDef[] = [
  { id: 'e1', name: 'Pair', foes: [{ foe: 'wisp' }, { foe: 'wisp' }] },
  { id: 'e2', name: 'One', foes: [{ foe: 'wisp' }] },
  { id: 'e3', name: 'Three', foes: [{ foe: 'wisp', hp: 0.8 }, { foe: 'wisp', hp: 0.8 }, { foe: 'wisp', hp: 0.8 }] },
  { id: 'elite', name: 'Elite', foes: [{ foe: 'husk' }] },
  { id: 'guard', name: 'Guardian', foes: [{ foe: 'husk', hp: 1.2 }] },
  { id: 'boss', name: 'Boss', foes: [{ foe: 'warden' }] },
];

export const STRATUM_DEFS: StratumDef[] = [
  {
    id: 'root',
    index: 0,
    name: 'The Root',
    blurb: 'Test stratum.',
    floors: [
      { battles: ['e1', 'e2', 'e3'], guardian: 'guard' },
      { battles: ['e1', 'e2', 'e3'], guardian: 'guard' },
      { battles: ['e1', 'e2', 'e3'], guardian: 'boss' },
    ],
    elites: ['elite'],
    events: ['ev.gift', 'ev.gamble', 'ev.cut'],
    hpScale: 1,
    powerScale: 1,
  },
];

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'ev.gift',
    title: 'A Gift',
    text: 'Someone left Embers on the stair.',
    choices: [
      { label: 'Take them', hint: '+20 Embers', outcome: [{ type: 'embers', amount: 20 }], after: 'You pocket them.' },
      { label: 'Wait for the owner', hint: 'A fight', outcome: [{ type: 'fight', encounter: 'e2' }], after: 'The owner was not friendly.' },
    ],
  },
  {
    id: 'ev.gamble',
    title: 'A Coin',
    text: 'Heads or tails.',
    choices: [
      {
        label: 'Flip',
        hint: 'Win a Glimmer or lose 5 HP',
        outcome: [{ type: 'chance', p: 0.5, win: [{ type: 'glimmer' }], lose: [{ type: 'hp', amount: -5 }], winText: 'Heads.', loseText: 'Tails.' }],
        after: 'It spins.',
      },
      { label: 'Walk on', hint: 'Nothing', outcome: [], after: 'You walk on.' },
    ],
  },
  {
    id: 'ev.cut',
    title: 'A Knife',
    text: 'Cut something away.',
    choices: [
      { label: 'Cut', hint: 'Remove a card', cost: { hp: 3 }, outcome: [{ type: 'pick', mode: 'remove' }], after: 'It hurts less than you thought.' },
      { label: 'Leave', hint: 'Nothing', outcome: [], after: 'You leave.' },
    ],
  },
];

export const GLIMMER_DEFS: GlimmerDef[] = [
  { id: 'g.edge', name: 'Edge', path: 'noonward', rarity: 1, text: '', passives: [{ type: 'damage', pct: 0.1 }] },
  { id: 'g.mark', name: 'Mark', path: 'noonward', rarity: 3, text: '', passives: [{ type: 'shellBonus', value: 1 }] },
  { id: 'g.breath', name: 'Breath', path: 'duskward', rarity: 1, text: '', passives: [{ type: 'openingLight', value: 1 }] },
  { id: 'g.wind', name: 'Wind', path: 'duskward', rarity: 2, text: '', passives: [{ type: 'breakDraw', value: 1 }] },
  { id: 'g.hearth', name: 'Hearth', path: 'nightward', rarity: 1, text: '', passives: [{ type: 'maxHp', value: 8 }] },
  { id: 'g.iron', name: 'Iron', path: 'nightward', rarity: 2, text: '', passives: [{ type: 'heldWard', value: 1 }] },
];

export const BEAT_DEFS: BeatDef[] = [
  { id: 'prologue', chapter: 0, title: 'Prologue', trigger: { type: 'start' }, lines: [{ who: 'narrator', text: 'Once.' }] },
  { id: 'after-first', chapter: 0, title: 'After', trigger: { type: 'firstClimbEnd' }, lines: [{ who: 'wren', text: 'Again.' }], gloam: 60 },
  { id: 'floor-2', chapter: 1, title: 'Higher', trigger: { type: 'reachFloor', stratum: 0, floor: 1 }, lines: [{ who: 'wren', text: 'Up.' }], unlocks: ['io'] },
  { id: 'root-cleared', chapter: 1, title: 'Root', trigger: { type: 'clearStratum', stratum: 0 }, lines: [{ who: 'wren', text: 'Done.' }], gloam: 250 },
];

const by = <T extends { id: string }>(list: readonly T[]) => {
  const m = new Map(list.map((x) => [x.id, x]));
  return (id: string): T => {
    const v = m.get(id);
    if (!v) throw new Error(`Unknown test id: ${id}`);
    return v;
  };
};

const cardMap = new Map(CARD_DEFS.map((c) => [c.id, c]));

export const climbDeps: ClimbDeps = {
  hero: by(HERO_DEFS),
  card: (id) => cardMap.get(id),
  foe: by(FOE_DEFS),
  encounter: by(ENCOUNTER_DEFS),
  glimmer: by(GLIMMER_DEFS),
  glimmers: () => GLIMMER_DEFS,
  event: by(EVENT_DEFS),
  stratum: (i) => {
    const s = STRATUM_DEFS[i];
    if (!s) throw new Error(`No stratum ${i}`);
    return s;
  },
  pool: () => CARD_DEFS.filter((c) => c.source === 'pool'),
};

export const lookup: ItemCatalog = (id) => {
  const hero = HERO_DEFS.find((h) => h.id === id);
  if (hero) return { kind: 'hero', rarity: hero.rarity };
  const c = cardMap.get(id);
  if (c?.stars) return { kind: 'card', rarity: c.stars };
  return undefined;
};
