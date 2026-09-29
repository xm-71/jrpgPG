import { AFFINITIES, ASH_ID, STATUSES, cardText, type EventOutcome } from '@duskline/core';
import { z } from 'zod';
import { activeBanners, KINDLING_ITEMS, rateUpBanner, STANDARD_BANNER } from './banners';
import { CARDS } from './index';
import { EVENTS } from './events';
import { FOES } from './foes';
import { GLIMMERS } from './glimmers';
import { HEROES } from './heroes';
import { BEATS } from './story';
import { ENCOUNTERS, STRATA } from './strata';

/**
 * Structural schemas for every kind of content, plus a validator for what a schema cannot see:
 * references between files, unique ids, and rules about how heroes and foes are built.
 * Tests run it, so a typo in a content file fails a test instead of a player's climb.
 */

const affinity = z.enum(AFFINITIES);
const status = z.enum(STATUSES);
const keyword = z.enum(['fleeting', 'spent', 'unplayable', 'pierce', 'linked', 'steadfast']);

const effect = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('status'), status, stacks: z.number().int().positive(), on: z.enum(['target', 'allFoes', 'self']).optional() }),
  z.strictObject({ type: z.literal('heal'), amount: z.number().int().positive() }),
  z.strictObject({ type: z.literal('draw'), count: z.number().int().positive() }),
  z.strictObject({ type: z.literal('light'), amount: z.number().int().positive() }),
  z.strictObject({ type: z.literal('ward'), amount: z.number().int().positive() }),
  z.strictObject({ type: z.literal('crack'), amount: z.number().int().positive() }),
  z.strictObject({ type: z.literal('gauge'), amount: z.number().int().positive() }),
  z.strictObject({ type: z.literal('cleanse') }),
]);

const cardNumbers = {
  cost: z.number().int().min(0).max(3),
  atk: z.number().int().min(0),
  hits: z.number().int().min(1).max(5).optional(),
  ward: z.number().int().min(0),
  effects: z.array(effect).optional(),
  keywords: z.array(keyword).optional(),
};

export const cardSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['strike', 'guard', 'balanced', 'rite', 'curse']),
  affinity: affinity.nullable(),
  target: z.enum(['foe', 'allFoes', 'self']),
  ...cardNumbers,
  plus: z.strictObject({ ...cardNumbers, cost: cardNumbers.cost.optional(), atk: cardNumbers.atk.optional(), ward: cardNumbers.ward.optional() }).optional(),
  tier: z.enum(['basic', 'common', 'uncommon', 'rare', 'special']),
  source: z.enum(['basic', 'pool', 'hero', 'bound', 'kindling', 'ultimate', 'curse', 'echo']),
  stars: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional(),
  hero: z.string().optional(),
  flavor: z.string().min(1),
  art: z.strictObject({ glyph: z.string().min(1), hue: z.number().min(0).max(360) }),
  hour: z.number().int().min(1).max(12).optional(),
});

const passiveParts: z.ZodType[] = [
  ...(['maxHp', 'maxLight', 'handLimit', 'heldWard', 'startWard', 'firstStrike', 'breakDraw', 'breakHeal', 'breakWard', 'shellBonus', 'startGauge', 'burnPower', 'openingLight', 'openingDraw', 'victoryHeal'] as const).map((t) =>
    z.strictObject({ type: z.literal(t), value: z.number().positive() }),
  ),
  ...(['damage', 'chainBonus', 'gaugeGain', 'healPower', 'emberGain'] as const).map((t) => z.strictObject({ type: z.literal(t), pct: z.number().positive().max(1) })),
  z.strictObject({ type: z.literal('affinityDamage'), affinity, pct: z.number().positive().max(1) }),
  z.strictObject({ type: z.literal('startStatus'), status, stacks: z.number().int().positive() }),
];
const passive = z.union(passiveParts as [z.ZodType, z.ZodType, ...z.ZodType[]]);

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const look = z.strictObject({
  height: z.number().min(0.8).max(1.2),
  style: z.enum(['shonen', 'rival', 'sukeban', 'kunoichi', 'bishonen', 'chibi', 'seinen', 'showa', 'shoujo', 'gekiga', 'majokko', 'yokai']),
  hair: z.enum(['spiky', 'hime', 'regent', 'bob', 'flowing', 'puff', 'windswept', 'explorer', 'curls', 'crop', 'twintails', 'hooded']),
  hairColor: hex,
  skin: hex,
  eyes: hex,
  outfit: hex,
  under: hex,
  accent: hex,
  prop: z.enum(['lantern', 'blade', 'rail', 'needle', 'greatsword', 'kite', 'baton', 'buoy', 'compass', 'wire', 'trowel', 'chochin']),
  wear: z.array(
    z.enum(['scarf', 'coat', 'draped', 'plaster', 'longskirt', 'mask', 'wraps', 'tattoos', 'headband', 'armor', 'goggles', 'overalls', 'cloak', 'hat', 'satchel', 'epaulettes', 'tiara', 'apron', 'beard', 'witchhat', 'frills', 'haori', 'gloves']),
  ),
  cape: z.boolean().optional(),
});

export const heroSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1),
  title: z.string().min(1),
  origin: z.enum(['story', 'afterlight']),
  rarity: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  role: z.enum(['striker', 'breaker', 'defender', 'support', 'debuffer', 'healer', 'burst']),
  affinity,
  hp: z.number().int().min(50).max(100),
  starter: z.array(z.string()).length(8),
  signature: z.array(z.string()).min(1),
  ultimate: z.string(),
  trait: z.strictObject({ name: z.string().min(1), passives: z.array(passive).min(1) }),
  turning: z.string().optional(),
  blurb: z.string().min(1),
  quote: z.string().min(1),
  look,
});

const move = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  dmg: z.number().int().positive().optional(),
  hits: z.number().int().min(2).max(5).optional(),
  pierce: z.boolean().optional(),
  ward: z.number().int().positive().optional(),
  wardAll: z.number().int().positive().optional(),
  rage: z.number().int().positive().optional(),
  rageAll: z.number().int().positive().optional(),
  heal: z.number().int().positive().optional(),
  healAll: z.number().int().positive().optional(),
  afflict: z.strictObject({ status: z.enum(['chill', 'hex', 'dim']), stacks: z.number().int().positive() }).optional(),
  curse: z.number().int().positive().optional(),
  shatter: z.boolean().optional(),
  summon: z.string().optional(),
});

export const foeSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  family: z.enum(['wisp', 'hound', 'wraith', 'husk', 'choir', 'static', 'warden', 'moth', 'acolyte', 'bell', 'keeper']),
  tier: z.enum(['mob', 'elite', 'boss']),
  hp: z.number().int().positive(),
  shell: z.number().int().min(0).max(10),
  weaknesses: z.array(affinity).min(1).max(3),
  resists: z.array(affinity),
  moves: z.array(move).min(1),
  pattern: z.array(z.string()).optional(),
  weights: z.record(z.string(), z.number().positive()).optional(),
  opener: z.string().optional(),
  blurb: z.string().min(1),
  scale: z.number().positive(),
  bind: z.string().optional(),
});

const encounterSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  foes: z
    .array(z.strictObject({ foe: z.string(), hp: z.number().positive().optional(), power: z.number().positive().optional() }))
    .min(1)
    .max(4),
  summons: z.array(z.string()).optional(),
});

const stratumSchema = z.strictObject({
  id: z.string().min(1),
  index: z.number().int().min(0),
  name: z.string().min(1),
  blurb: z.string().min(1),
  floors: z.array(z.strictObject({ battles: z.array(z.string()).min(2), guardian: z.string() })).length(3),
  elites: z.array(z.string()).min(1),
  events: z.array(z.string()).min(4),
  hpScale: z.number().positive(),
  powerScale: z.number().positive(),
  eliteFrom: z.number().int().min(0).max(2).optional(),
});

const outcome: z.ZodType<EventOutcome> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('hp'), amount: z.number().int() }),
    z.strictObject({ type: z.literal('maxHp'), amount: z.number().int() }),
    z.strictObject({ type: z.literal('embers'), amount: z.number().int() }),
    z.strictObject({ type: z.literal('card'), card: z.string() }),
    z.strictObject({ type: z.literal('randomCard'), tier: z.enum(['common', 'uncommon', 'rare']) }),
    z.strictObject({ type: z.literal('curse'), count: z.number().int().positive() }),
    z.strictObject({ type: z.literal('glimmer') }),
    z.strictObject({ type: z.literal('pick'), mode: z.enum(['remove', 'upgrade', 'duplicate']) }),
    z.strictObject({ type: z.literal('upgradeRandom'), count: z.number().int().positive() }),
    z.strictObject({ type: z.literal('fight'), encounter: z.string() }),
    z.strictObject({ type: z.literal('echo') }),
    z.strictObject({ type: z.literal('chance'), p: z.number().gt(0).lt(1), win: z.array(outcome), lose: z.array(outcome), winText: z.string().min(1), loseText: z.string().min(1) }),
  ]),
) as z.ZodType<EventOutcome>;

const eventSchema = z.strictObject({
  id: z.string().regex(/^ev\./),
  title: z.string().min(1),
  text: z.string().min(1),
  choices: z
    .array(
      z.strictObject({
        label: z.string().min(1),
        hint: z.string().min(1),
        cost: z.strictObject({ embers: z.number().int().positive().optional(), hp: z.number().int().positive().optional() }).optional(),
        outcome: z.array(outcome),
        after: z.string().min(1),
      }),
    )
    .min(2)
    .max(4),
});

const glimmerSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.enum(['noonward', 'duskward', 'nightward']),
  rarity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1),
  passives: z.array(passive).min(1),
});

const beatSchema = z.strictObject({
  id: z.string().min(1),
  chapter: z.number().int().min(0),
  title: z.string().min(1),
  trigger: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('start') }),
    z.strictObject({ type: z.literal('firstClimbEnd') }),
    z.strictObject({ type: z.literal('reachFloor'), stratum: z.number().int().min(0), floor: z.number().int().min(0).max(2) }),
    z.strictObject({ type: z.literal('clearStratum'), stratum: z.number().int().min(0) }),
  ]),
  lines: z.array(z.strictObject({ who: z.string().min(1), text: z.string().min(1), mood: z.enum(['calm', 'fierce', 'hurt', 'smile', 'shock']).optional() })).min(1),
  gloam: z.number().int().positive().optional(),
  unlocks: z.array(z.string()).optional(),
  sky: z.enum(['dusk', 'night', 'noon']).optional(),
});

function check<T>(schema: z.ZodType<T>, what: string, items: readonly { id: string }[], err: (m: string) => void): void {
  for (const x of items) {
    const r = schema.safeParse(x);
    if (!r.success) err(`${what} ${x.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
}

function outcomes(list: readonly EventOutcome[]): EventOutcome[] {
  return list.flatMap((o) => (o.type === 'chance' ? [o, ...outcomes(o.win), ...outcomes(o.lose)] : [o]));
}

/** Every problem found, as readable sentences. An empty list means the content is sound. */
export function validateContent(): string[] {
  const problems: string[] = [];
  const err = (m: string): void => void problems.push(m);

  check(cardSchema, 'card', CARDS, err);
  check(heroSchema, 'hero', HEROES, err);
  check(foeSchema, 'foe', FOES, err);
  check(encounterSchema, 'encounter', ENCOUNTERS, err);
  check(stratumSchema, 'stratum', STRATA, err);
  check(eventSchema, 'event', EVENTS, err);
  check(glimmerSchema, 'glimmer', GLIMMERS, err);
  check(beatSchema, 'beat', BEATS, err);

  const unique = (what: string, ids: readonly string[]): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`duplicate ${what} id ${id}`);
      seen.add(id);
    }
  };
  unique('card', CARDS.map((c) => c.id));
  unique('hero', HEROES.map((h) => h.id));
  unique('foe', FOES.map((f) => f.id));
  unique('encounter', ENCOUNTERS.map((e) => e.id));
  unique('event', EVENTS.map((e) => e.id));
  unique('glimmer', GLIMMERS.map((g) => g.id));
  unique('beat', BEATS.map((b) => b.id));

  const cards = new Map(CARDS.map((c) => [c.id, c]));
  const heroes = new Set(HEROES.map((h) => h.id));
  const foes = new Map(FOES.map((f) => [f.id, f]));
  const encounters = new Set(ENCOUNTERS.map((e) => e.id));
  const events = new Set(EVENTS.map((e) => e.id));

  if (!cards.has(ASH_ID)) err('the Ash curse card is missing');
  for (const c of CARDS) {
    if (c.kind !== 'curse' && cardText(c).length === 0) err(`card ${c.id} has no rules text`);
    if (c.source === 'hero' && (!c.hero || !heroes.has(c.hero))) err(`hero card ${c.id} names no hero`);
    if (c.source === 'kindling' && !c.stars) err(`kindled card ${c.id} has no Kindling rarity`);
    if (c.source === 'ultimate' && c.cost !== 0) err(`ultimate ${c.id} should cost 0`);
    if (c.plus && c.kind !== 'curse' && c.source !== 'ultimate' && c.plus.cost === undefined && c.plus.atk === undefined && c.plus.ward === undefined && !c.plus.effects && !c.plus.keywords && !c.plus.hits) err(`card ${c.id} has an empty temper`);
    if (c.kind !== 'curse' && !c.plus) err(`card ${c.id} cannot be tempered`);
  }

  for (const h of HEROES) {
    for (const id of [...h.starter, ...h.signature, h.ultimate]) if (!cards.has(id)) err(`hero ${h.id} uses a missing card ${id}`);
    for (const id of h.signature) if (cards.get(id)?.hero !== h.id) err(`hero ${h.id}: signature card ${id} belongs to someone else`);
    if (cards.get(h.ultimate)?.source !== 'ultimate') err(`hero ${h.id}: ${h.ultimate} is not an ultimate`);
    const sig = h.starter.filter((id) => cards.get(id)?.source === 'hero');
    if (sig.length !== 2 || sig.some((id) => cards.get(id)?.hero !== h.id)) err(`hero ${h.id} should start with two copies of their own signature card`);
    if (cards.get(sig[0] ?? '')?.affinity !== h.affinity) err(`hero ${h.id}: starter signature should share the hero's affinity`);
  }

  for (const f of FOES) {
    const ids = new Set(f.moves.map((m) => m.id));
    for (const id of [...(f.pattern ?? []), ...Object.keys(f.weights ?? {}), ...(f.opener ? [f.opener] : [])]) if (!ids.has(id)) err(`foe ${f.id} refers to a missing move ${id}`);
    if (f.bind && cards.get(f.bind)?.source !== 'bound') err(`foe ${f.id} binds into ${f.bind}, which is not a bound card`);
    for (const m of f.moves) if (m.summon && !foes.has(m.summon)) err(`foe ${f.id} summons a missing foe ${m.summon}`);
    for (const a of f.weaknesses) if (f.resists.includes(a)) err(`foe ${f.id} is both weak to and resists ${a}`);
  }

  for (const e of ENCOUNTERS) {
    for (const sp of e.foes) if (!foes.has(sp.foe)) err(`encounter ${e.id} uses a missing foe ${sp.foe}`);
    for (const id of e.summons ?? []) if (!foes.has(id)) err(`encounter ${e.id} can summon a missing foe ${id}`);
    const summons = FOES.filter((f) => e.foes.some((sp) => sp.foe === f.id)).flatMap((f) => f.moves.map((m) => m.summon).filter((x): x is string => !!x));
    for (const s of summons) if (!(e.summons ?? []).includes(s)) err(`encounter ${e.id} has a foe that summons ${s} but does not list it`);
  }

  STRATA.forEach((s, i) => {
    if (s.index !== i) err(`stratum ${s.id} is listed at ${i} but says ${s.index}`);
    for (const f of s.floors) for (const id of [...f.battles, f.guardian]) if (!encounters.has(id)) err(`stratum ${s.id} uses a missing encounter ${id}`);
    for (const id of s.elites) if (!encounters.has(id)) err(`stratum ${s.id} uses a missing elite ${id}`);
    for (const id of s.events) if (!events.has(id)) err(`stratum ${s.id} uses a missing event ${id}`);
    const boss = ENCOUNTERS.find((e) => e.id === s.floors[2]?.guardian);
    if (!boss?.foes.some((sp) => foes.get(sp.foe)?.tier === 'boss')) err(`stratum ${s.id} does not end in a boss`);
  });

  for (const e of EVENTS) {
    for (const ch of e.choices) {
      for (const o of outcomes(ch.outcome)) {
        if (o.type === 'card' && !cards.has(o.card)) err(`event ${e.id} gives a missing card ${o.card}`);
        if (o.type === 'fight' && !encounters.has(o.encounter)) err(`event ${e.id} starts a missing fight ${o.encounter}`);
      }
      const follows = outcomes(ch.outcome).filter((o) => o.type === 'glimmer' || o.type === 'pick' || o.type === 'fight' || o.type === 'echo');
      const direct = ch.outcome.filter((o) => o.type === 'glimmer' || o.type === 'pick' || o.type === 'fight' || o.type === 'echo');
      if (direct.length > 1 || (direct.length === 1 && follows.length > 1)) err(`event ${e.id}: "${ch.label}" starts more than one thing`);
    }
  }

  for (const b of BEATS) for (const id of b.unlocks ?? []) if (!heroes.has(id)) err(`beat ${b.id} unlocks a missing hero ${id}`);

  // Kindling can only give things that exist.
  const catalogIds = new Set([...HEROES.map((h) => h.id), ...CARDS.filter((c) => c.stars).map((c) => c.id)]);
  for (const id of [...KINDLING_ITEMS.five, ...KINDLING_ITEMS.four, ...KINDLING_ITEMS.three]) if (!catalogIds.has(id)) err(`Kindling item ${id} does not exist`);
  for (const b of [STANDARD_BANNER, rateUpBanner(0), rateUpBanner(1), rateUpBanner(2), activeBanners(Date.now()).rateUp]) {
    for (const id of [...b.pool.five, ...b.pool.four, ...b.pool.three, ...b.featured.five, ...b.featured.four]) if (!catalogIds.has(id)) err(`banner ${b.id} lists a missing item ${id}`);
  }
  for (const c of CARDS.filter((x) => x.stars)) {
    const listed = c.stars === 5 ? KINDLING_ITEMS.five : c.stars === 4 ? KINDLING_ITEMS.four : KINDLING_ITEMS.three;
    if (!(listed as readonly string[]).includes(c.id)) err(`kindled card ${c.id} is not in the Kindling pool at ★${c.stars}`);
  }
  return problems;
}
