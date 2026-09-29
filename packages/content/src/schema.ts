import { AFFINITIES } from '@duskline/core';
import { z } from 'zod';
import { activeBanners, KINDLING_ITEMS, rateUpBanner, STANDARD_BANNER } from './banners';
import { CARDS } from './cards';
import { DESCENT_ENCOUNTERS, DESCENT_POOLS } from './descent';
import { ENEMIES } from './enemies';
import { GLIMMERS } from './glimmers';
import { HEROES } from './heroes';
import { ENCOUNTERS, STAGES } from './stages';

/**
 * Structural schemas for every kind of content, plus a validator for the things a schema cannot
 * see: references between files, id uniqueness, and rules about how heroes and enemies are built.
 * Tests run it, so a typo in a content file fails a test instead of a player's battle.
 */

const affinity = z.enum(AFFINITIES);
const rarity = z.union([z.literal(3), z.literal(4), z.literal(5)]);
const stats = z.strictObject({
  hp: z.number().positive(),
  atk: z.number().positive(),
  def: z.number().nonnegative(),
  spd: z.number().positive(),
});
const scope = z.enum(['targets', 'self', 'party', 'foes']);

const effect = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('mod'), on: scope, stat: z.enum(['atk', 'def', 'spd']), pct: z.number(), turns: z.number().int().positive() }),
  z.strictObject({ type: z.literal('heal'), on: scope, of: z.enum(['atk', 'maxHp']), scale: z.number().positive() }),
  z.strictObject({ type: z.literal('delay'), on: scope, pct: z.number().positive() }),
  z.strictObject({ type: z.literal('advance'), on: scope, pct: z.number().positive() }),
  z.strictObject({ type: z.literal('taunt'), turns: z.number().int().positive() }),
  z.strictObject({ type: z.literal('gauge'), on: scope, amount: z.number().positive() }),
]);

const skill = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['basic', 'skill', 'ultimate']),
  affinity: affinity.nullable(),
  target: z.enum(['enemy', 'allEnemies', 'ally', 'allAllies', 'self']),
  power: z.number().nonnegative(),
  shell: z.number().int().nonnegative(),
  lantern: z.number().int(),
  gauge: z.number().nonnegative(),
  timeCost: z.number().positive().optional(),
  effects: z.array(effect).optional(),
  heavy: z.boolean().optional(),
  blurb: z.string().min(1),
});

const valuePassive = <T extends string>(type: T) => z.strictObject({ type: z.literal(type), value: z.number() });

const passive = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('stat'), stat: z.enum(['hp', 'atk', 'def', 'spd']), pct: z.number() }),
  valuePassive('startGauge'),
  valuePassive('startLantern'),
  valuePassive('shellBonus'),
  valuePassive('breakHeal'),
  valuePassive('encoreDamage'),
  valuePassive('burstDamage'),
  valuePassive('healPower'),
  valuePassive('gaugeGain'),
  valuePassive('guardPower'),
]);

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const look = z.strictObject({
  height: z.number().min(0.8).max(1.2),
  hair: z.enum(['short', 'long', 'ponytail', 'spiky', 'bob', 'hooded', 'crown']),
  hairColor: hex,
  skin: hex,
  outfit: hex,
  accent: hex,
  prop: z.enum(['lantern', 'blade', 'rail', 'needle', 'greatsword', 'kite', 'staff', 'bow', 'orb', 'anchor', 'compass', 'scroll', 'wire', 'trowel']),
  cape: z.boolean().optional(),
});

export const heroSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  title: z.string().min(1),
  origin: z.enum(['story', 'afterlight']),
  rarity,
  role: z.enum(['striker', 'breaker', 'defender', 'support', 'debuffer', 'healer', 'burst']),
  affinity,
  base: stats,
  kit: z.strictObject({ basic: skill, skill, ultimate: skill }),
  turning: z.string().optional(),
  blurb: z.string().min(20),
  quote: z.string().min(5),
  look,
});

export const cardSchema = z.strictObject({
  id: z.string().regex(/^card\.[a-z0-9-]+$/),
  name: z.string().min(1),
  rarity,
  blurb: z.string().min(5),
  passives: z.array(passive).min(1),
  art: z.strictObject({
    hue: z.number().min(0).max(360),
    glyph: z.enum(['lantern', 'coat', 'compass', 'biscuit', 'whistle', 'ledger', 'chime', 'ribbon', 'anchor', 'sun', 'key']),
  }),
});

export const enemySchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  family: z.enum(['wisp', 'hound', 'wraith', 'husk', 'choir', 'static', 'warden']),
  tier: z.enum(['mob', 'elite', 'boss']),
  base: stats,
  shell: z.number().int().min(1),
  weaknesses: z.array(affinity).min(1).max(2),
  resists: z.array(affinity),
  foeKit: z.array(skill).min(1),
  ai: z
    .strictObject({
      pattern: z.array(z.string()).optional(),
      weights: z.record(z.string(), z.number().nonnegative()).optional(),
      focus: z.enum(['random', 'lowestHp', 'highestAtk']).optional(),
    })
    .optional(),
  blurb: z.string().min(10),
  scale: z.number().min(0.5).max(2.5),
});

export const glimmerSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  path: z.enum(['noonward', 'duskward', 'nightward']),
  rarity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(8),
  passives: z.array(passive).min(1),
});

const line = z.strictObject({ who: z.string().min(1), text: z.string().min(1) });

export const stageSchema = z.strictObject({
  id: z.string().regex(/^\d+-\d+$/),
  chapter: z.number().int().nonnegative(),
  name: z.string().min(1),
  blurb: z.string().min(1),
  level: z.number().int().min(1),
  encounter: z.string(),
  forcedParty: z.array(z.string()).optional(),
  firstClearGloam: z.number().int().nonnegative(),
  xp: z.number().int().positive(),
  unlocks: z.array(z.string()).optional(),
  before: z.array(line).min(1),
  after: z.array(line).min(1),
});

export const encounterSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  foes: z
    .array(
      z.strictObject({
        enemy: z.string(),
        levelOffset: z.number().int().optional(),
        hpMult: z.number().positive().optional(),
        atkMult: z.number().positive().optional(),
      }),
    )
    .min(1)
    .max(4),
});

/** Cross-file checks. Returns human-readable problems; an empty list means the content is sound. */
export function validateContent(): string[] {
  const problems: string[] = [];
  const err = (m: string): void => void problems.push(m);

  // Structure
  for (const h of HEROES) {
    const r = heroSchema.safeParse(h);
    if (!r.success) err(`hero ${h.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const c of CARDS) {
    const r = cardSchema.safeParse(c);
    if (!r.success) err(`card ${c.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const e of ENEMIES) {
    const r = enemySchema.safeParse(e);
    if (!r.success) err(`enemy ${e.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const e of ENCOUNTERS) {
    const r = encounterSchema.safeParse(e);
    if (!r.success) err(`encounter ${e.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const s of STAGES) {
    const r = stageSchema.safeParse(s);
    if (!r.success) err(`stage ${s.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }

  // Unique ids
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string): void => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) err(`duplicate ${kind} id ${id}`);
    seen.set(key, id);
  };
  HEROES.forEach((h) => claim('hero', h.id));
  CARDS.forEach((c) => claim('card', c.id));
  ENEMIES.forEach((e) => claim('enemy', e.id));
  ENCOUNTERS.forEach((e) => claim('encounter', e.id));
  STAGES.forEach((s) => claim('stage', s.id));
  const skillIds = new Set<string>();
  const claimSkill = (id: string): void => {
    if (skillIds.has(id)) err(`duplicate skill id ${id}`);
    skillIds.add(id);
  };
  const heroIds = new Set(HEROES.map((h) => h.id));
  const cardIds = new Set(CARDS.map((c) => c.id));
  if ([...heroIds].some((id) => cardIds.has(id))) err('a hero id collides with a card id');

  // Heroes
  for (const h of HEROES) {
    const { basic, skill: sk, ultimate } = h.kit;
    [basic, sk, ultimate].forEach((s) => claimSkill(s.id));
    if (basic.kind !== 'basic' || basic.lantern !== 1 || basic.target !== 'enemy' || basic.power <= 0) err(`hero ${h.id}: basic must be a damaging Lantern builder`);
    if (basic.affinity !== h.affinity) err(`hero ${h.id}: basic attack should use the hero's affinity`);
    if (sk.kind !== 'skill' || sk.lantern >= 0) err(`hero ${h.id}: skill must cost Lantern`);
    if (ultimate.kind !== 'ultimate' || ultimate.lantern !== 0 || ultimate.gauge !== 0) err(`hero ${h.id}: ultimate must be free and use the gauge`);
    for (const s of [basic, sk, ultimate]) {
      if (s.power === 0 && !(s.effects && s.effects.length > 0)) err(`skill ${s.id}: does nothing`);
      if (s.power === 0 && s.shell > 0) err(`skill ${s.id}: Shell damage without damage`);
      if (s.target === 'self' && s.power > 0) err(`skill ${s.id}: self-targeted skills cannot deal damage`);
    }
    if (h.role === 'healer' && !JSON.stringify(h.kit).includes('"heal"')) err(`hero ${h.id}: a healer with no healing`);
    if (h.origin === 'afterlight' && (h.rarity === 3 || !h.turning)) err(`hero ${h.id}: an Afterlight needs rarity 4 or 5 and a Turning`);
    if (h.origin === 'afterlight' && !KINDLING_ITEMS.five.concat(KINDLING_ITEMS.four as never).includes(h.id as never)) err(`hero ${h.id}: an Afterlight that no banner can give`);
  }
  for (const a of AFFINITIES) {
    if (!HEROES.some((h) => h.origin === 'story' && h.affinity === a)) err(`no story hero covers ${a}`);
    if (!ENEMIES.some((e) => e.weaknesses.includes(a))) err(`no enemy is weak to ${a}`);
  }

  // Enemies
  for (const e of ENEMIES) {
    e.foeKit.forEach((s) => claimSkill(s.id));
    if (new Set(e.weaknesses).size !== e.weaknesses.length) err(`enemy ${e.id}: duplicate weakness`);
    if (e.weaknesses.some((w) => e.resists.includes(w))) err(`enemy ${e.id}: weak and resistant to the same affinity`);
    const ids = new Set(e.foeKit.map((s) => s.id));
    for (const id of e.ai?.pattern ?? []) if (!ids.has(id)) err(`enemy ${e.id}: pattern names unknown skill ${id}`);
    for (const id of Object.keys(e.ai?.weights ?? {})) if (!ids.has(id)) err(`enemy ${e.id}: weight names unknown skill ${id}`);
    for (const s of e.foeKit) if (s.kind !== 'skill') err(`enemy skill ${s.id} must have kind "skill"`);
  }

  // Encounters and stages
  const enemyIds = new Set(ENEMIES.map((e) => e.id));
  const encounterIds = new Set(ENCOUNTERS.map((e) => e.id));
  for (const e of ENCOUNTERS) for (const f of e.foes) if (!enemyIds.has(f.enemy)) err(`encounter ${e.id}: unknown enemy ${f.enemy}`);
  let lastLevel = 0;
  for (const s of STAGES) {
    if (!encounterIds.has(s.encounter)) err(`stage ${s.id}: unknown encounter ${s.encounter}`);
    for (const id of s.forcedParty ?? []) if (!heroIds.has(id)) err(`stage ${s.id}: unknown forced hero ${id}`);
    for (const id of s.unlocks ?? []) {
      const h = HEROES.find((x) => x.id === id);
      if (!h) err(`stage ${s.id}: unlocks unknown hero ${id}`);
      else if (h.origin !== 'story') err(`stage ${s.id}: unlocks ${id}, who comes from Kindling`);
    }
    if (s.level < lastLevel) err(`stage ${s.id}: level goes down`);
    lastLevel = s.level;
    for (const l of [...s.before, ...s.after]) {
      if (l.who !== 'narrator' && !heroIds.has(l.who) && !ENEMIES.some((e) => e.name === l.who)) err(`stage ${s.id}: unknown speaker "${l.who}"`);
    }
  }

  // Banners
  const rarityOf = (id: string): number | undefined => HEROES.find((h) => h.id === id)?.rarity ?? CARDS.find((c) => c.id === id)?.rarity;
  const banners = [STANDARD_BANNER, ...Array.from({ length: 9 }, (_, i) => rateUpBanner(i))];
  banners.push(activeBanners(Date.now()).rateUp);
  for (const b of banners) {
    const groups: Array<[string, readonly string[], number]> = [
      ['pool.five', b.pool.five, 5],
      ['pool.four', b.pool.four, 4],
      ['pool.three', b.pool.three, 3],
      ['featured.five', b.featured.five, 5],
      ['featured.four', b.featured.four, 4],
    ];
    for (const [label, ids, want] of groups) {
      for (const id of ids) {
        const r = rarityOf(id);
        if (r === undefined) err(`banner ${b.id}: ${label} names unknown item ${id}`);
        else if (r !== want) err(`banner ${b.id}: ${label} item ${id} is ${r}-star`);
      }
    }
    const featured = new Set([...b.featured.five, ...b.featured.four]);
    for (const id of [...b.pool.five, ...b.pool.four, ...b.pool.three]) if (featured.has(id)) err(`banner ${b.id}: ${id} is both featured and in the pool`);
    if (b.pool.three.length === 0 || b.pool.four.length === 0) err(`banner ${b.id}: empty pool`);
    if (b.pool.five.length === 0) err(`banner ${b.id}: no off-banner 5-stars`);
    if (b.cost.single <= 0 || b.cost.ten <= 0) err(`banner ${b.id}: bad cost`);
    if (b.featured.five.length > 0 && !b.rules.spark) err(`banner ${b.id}: a rate-up banner without a spark`);
    if (b.rules.five.hard > 0 && b.rules.five.softStart >= b.rules.five.hard) err(`banner ${b.id}: soft pity starts at or after hard pity`);
  }

  // Descent
  const allEncounters = [...ENCOUNTERS, ...DESCENT_ENCOUNTERS];
  const encIds = new Set<string>();
  for (const e of allEncounters) {
    if (encIds.has(e.id)) err(`duplicate encounter id ${e.id}`);
    encIds.add(e.id);
  }
  for (const e of DESCENT_ENCOUNTERS) {
    const r = encounterSchema.safeParse(e);
    if (!r.success) err(`descent encounter ${e.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    for (const f of e.foes) {
      if (!enemyIds.has(f.enemy)) err(`descent encounter ${e.id}: unknown enemy ${f.enemy}`);
      if ((f.hpMult ?? 1) <= 0 || (f.atkMult ?? 1) <= 0) err(`descent encounter ${e.id}: multipliers must be positive`);
    }
  }
  const descentIds = new Set(DESCENT_ENCOUNTERS.map((e) => e.id));
  for (const [tier, ids] of Object.entries(DESCENT_POOLS)) {
    for (const id of ids) if (!descentIds.has(id)) err(`descent pool ${tier}: unknown encounter ${id}`);
  }
  if (DESCENT_POOLS.boss.length < 3) err('descent needs a boss encounter for each of three floors');
  if (DESCENT_POOLS.normal.length < 3) err('descent needs at least three ordinary encounters so a floor can offer two different ones');
  for (const id of DESCENT_POOLS.elite) {
    const e = DESCENT_ENCOUNTERS.find((x) => x.id === id);
    if (e && !e.foes.some((f) => ENEMIES.find((en) => en.id === f.enemy)?.tier !== 'mob')) err(`descent elite ${id} has no elite or boss foe`);
  }
  const glimmerIds = new Set<string>();
  for (const g of GLIMMERS) {
    const r = glimmerSchema.safeParse(g);
    if (!r.success) err(`glimmer ${g.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    if (glimmerIds.has(g.id)) err(`duplicate glimmer id ${g.id}`);
    glimmerIds.add(g.id);
  }
  for (const path of ['noonward', 'duskward', 'nightward'] as const) {
    if (GLIMMERS.filter((g) => g.path === path).length < 4) err(`path ${path} has fewer than four Glimmers`);
    if (!GLIMMERS.some((g) => g.path === path && g.rarity === 3)) err(`path ${path} has no rarity-3 Glimmer`);
  }
  // A full run takes an opening pick plus one per battle: at most ten.
  if (GLIMMERS.length < 10) err('fewer Glimmers than a full run can ask for');

  return problems;
}
