import { Rng, deriveSeed } from '../rng';
import { AFFINITIES, type Affinity } from '../types';
import type { CardDef, CardEffect, CardKind, CardTarget, Keyword } from './defs';
import type { CardBattleStats } from './state';

/**
 * Echoes: cards the tower makes from how you fight. The Gnomon watches a run (what you play,
 * what you hold, how often you Break and Chain, how much you bleed) and answers with a card
 * built from those habits. Everything is rules and a seed, so the same run makes the same Echo.
 */

export interface PlayStyle {
  battles: number;
  cardsPlayed: number;
  held: number;
  heldWard: number;
  breaks: number;
  chains: number;
  maxChain: number;
  damageTaken: number;
  plays: Record<string, number>;
  kinds: Record<string, number>;
}

export function newStyle(): PlayStyle {
  return { battles: 0, cardsPlayed: 0, held: 0, heldWard: 0, breaks: 0, chains: 0, maxChain: 0, damageTaken: 0, plays: {}, kinds: {} };
}

/** Fold one finished fight into the run's style. Mutates `style`. */
export function addToStyle(style: PlayStyle, s: CardBattleStats): void {
  style.battles++;
  style.cardsPlayed += s.cardsPlayed;
  style.held += s.held;
  style.heldWard += s.heldWard;
  style.breaks += s.breaks;
  style.chains += s.chains;
  style.maxChain = Math.max(style.maxChain, s.maxChain);
  style.damageTaken += s.damageTaken;
  for (const [k, v] of Object.entries(s.plays)) style.plays[k] = (style.plays[k] ?? 0) + v;
  for (const [k, v] of Object.entries(s.kinds)) style.kinds[k] = (style.kinds[k] ?? 0) + v;
}

export type EchoTrait = 'breaker' | 'chainer' | 'warden' | 'survivor' | 'striker';

/** The habit that stands out most in a run, with a little noise so close calls vary. */
export function dominantTrait(style: PlayStyle, rng: Rng): EchoTrait {
  const per = Math.max(1, style.battles);
  const played = Math.max(1, style.cardsPlayed);
  const holdRatio = style.held / Math.max(1, style.held + style.cardsPlayed);
  const signals: Array<[EchoTrait, number]> = [
    ['breaker', style.breaks / per / 1.0],
    ['chainer', style.chains / per / 1.0 + (style.maxChain >= 3 ? 0.3 : 0)],
    ['warden', holdRatio / 0.45],
    ['survivor', style.damageTaken / per / 14],
    ['striker', (style.kinds['strike'] ?? 0) / played / 0.5],
  ];
  let best: EchoTrait = 'striker';
  let bestScore = -Infinity;
  for (const [t, v] of signals) {
    const score = v * (0.9 + rng.next() * 0.2);
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

const AFFINITY_HUE: Record<Affinity, number> = { sun: 42, moon: 232, flame: 12, frost: 196, gale: 150, volt: 56 };

const ADJECTIVES: Record<Affinity, readonly string[]> = {
  sun: ['Gilded', 'Unsetting', 'Candent', 'Noonward', 'Haloed'],
  moon: ['Waning', 'Lidless', 'Pale', 'Nocturne', 'Eclipsed'],
  flame: ['Cinder', 'Pyre', 'Scorched', 'Ember-eyed', 'Kindled'],
  frost: ['Rime', 'Glass', 'Stillwater', 'Hoarfrost', 'Frozen'],
  gale: ['Loosed', 'Kiting', 'Weathervane', 'Unbound', 'Skirling'],
  volt: ['Arc', 'Wireborn', 'Crackling', 'Thundered', 'Galvanic'],
};

const NOUNS: Record<Exclude<CardKind, 'curse' | 'rite'>, readonly string[]> = {
  strike: ['Cut', 'Verdict', 'Talon', 'Lance', 'Edge', 'Sentence'],
  guard: ['Vigil', 'Mantle', 'Screen', 'Bulwark', 'Shroud', 'Wall'],
  balanced: ['Litany', 'Seal', 'Refrain', 'Oath', 'Sigil', 'Office'],
};

const HOURS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'] as const;

const FLAVOR: Record<EchoTrait, readonly string[]> = {
  breaker: ['The Gnomon heard you break them, and kept the sound.', 'Shell remembers the hand that cracked it.'],
  chainer: ['One motion, repeated until it became a prayer.', 'The tower counted your rhythm and wrote it down.'],
  warden: ['Every card you held back, the tower held too.', 'A patience the stairs had not seen in an age.'],
  survivor: ['Written in what you bled on the stairs.', 'The shadow kept a little of what you lost.'],
  striker: ['The shadow learned your stance before you did.', 'You never waited. Neither will this.'],
};

/** What the affinity's signature effect costs out of the card's budget. */
function affinityEffect(a: Affinity, power: number): { effect: CardEffect; cost: number } {
  switch (a) {
    case 'sun':
      return { effect: { type: 'heal', amount: 2 + power }, cost: 2 + power };
    case 'moon': {
      const stacks = power > 2 ? 2 : 1;
      return { effect: { type: 'status', status: 'hex', stacks }, cost: 3 * stacks };
    }
    case 'flame': {
      const stacks = 2 + power;
      return { effect: { type: 'status', status: 'burn', stacks }, cost: stacks * 1.2 };
    }
    case 'frost': {
      const stacks = power > 2 ? 2 : 1;
      return { effect: { type: 'status', status: 'chill', stacks }, cost: 2.5 * stacks };
    }
    case 'gale':
      return { effect: { type: 'draw', count: 1 }, cost: 4 };
    case 'volt': {
      const stacks = 2 + power;
      return { effect: { type: 'status', status: 'shock', stacks }, cost: stacks };
    }
  }
}

export interface EchoOptions {
  /** The run's seed. */
  seed: string;
  /** Which Echo of the run this is, so two Mirrors give different cards. */
  index: number;
  heroAffinity: Affinity;
  /** 0, 1 or 2: deeper strata make stronger Echoes. */
  stratum: number;
}

function pickAffinity(style: PlayStyle, hero: Affinity, rng: Rng): Affinity {
  const items = AFFINITIES.map((a) => ({ weight: (style.plays[a] ?? 0) + (a === hero ? 2 : 0), value: a }));
  return items.some((i) => i.weight > 0) ? rng.weighted(items) : hero;
}

export function generateEcho(style: PlayStyle, o: EchoOptions): CardDef {
  const seed = deriveSeed('echo', o.seed, o.index, style.battles, style.cardsPlayed);
  const rng = new Rng(seed);
  const trait = dominantTrait(style, rng);
  const affinity = pickAffinity(style, o.heroAffinity, rng);

  const holdRatio = style.held / Math.max(1, style.held + style.cardsPlayed);
  let kind: 'strike' | 'guard' | 'balanced' = holdRatio > 0.42 ? 'guard' : holdRatio < 0.28 ? 'strike' : 'balanced';
  if (trait === 'warden') kind = 'guard';
  if (trait === 'striker') kind = 'strike';

  const rare = rng.chance(0.2);
  const cost = rng.pick(kind === 'guard' ? [1, 1, 1, 2] : kind === 'strike' ? [1, 1, 2] : [1, 2]);
  const power = 1 + o.stratum + (rare ? 1 : 0);
  // A little richer than a pool card of the same cost: the tower's answer should feel like a gift.
  let budget = 8 + 5 * cost + 2 * o.stratum + (rare ? 3 : 0);

  const effects: CardEffect[] = [];
  const keywords: Keyword[] = [];
  const sig = affinityEffect(affinity, power);
  effects.push(sig.effect);
  budget -= sig.cost;
  let hits = 1;
  switch (trait) {
    case 'breaker':
      effects.push({ type: 'crack', amount: 1 });
      budget -= 3;
      break;
    case 'chainer':
      keywords.push('linked');
      budget -= 2;
      break;
    case 'warden': {
      const w = 3 + o.stratum;
      effects.push({ type: 'ward', amount: w });
      budget -= w * 0.8;
      break;
    }
    case 'survivor': {
      const h = 3 + o.stratum;
      effects.push({ type: 'heal', amount: h });
      budget -= h;
      break;
    }
    case 'striker':
      hits = 2;
      break;
  }

  const target: CardTarget = kind !== 'guard' && (affinity === 'gale' || affinity === 'flame') && rng.chance(0.25) ? 'allFoes' : 'foe';
  const left = Math.max(3, budget);
  const atkShare = kind === 'strike' ? 0.8 : kind === 'guard' ? 0.2 : 0.5;
  let atk = Math.round(left * atkShare * (target === 'allFoes' ? 0.6 : 1));
  if (hits > 1) atk = Math.max(1, Math.round(atk * 0.55));
  const ward = Math.round(left * (1 - atkShare));

  const hour = 1 + rng.int(12);
  const adj = rng.pick(ADJECTIVES[affinity]);
  const noun = rng.pick(NOUNS[kind]);
  const name = rng.chance(0.4) ? `${adj} ${noun} of the ${HOURS[hour - 1]} Hour` : `${adj} ${noun}`;

  const plus: CardDef['plus'] =
    kind === 'strike' ? { atk: atk + (hits > 1 ? 2 : 3) } : kind === 'guard' ? { ward: ward + 3 } : { atk: atk + 2, ward: ward + 2 };

  return {
    id: `echo:${seed.toString(36)}`,
    name,
    kind,
    affinity,
    target,
    cost,
    atk,
    ...(hits > 1 ? { hits } : {}),
    ward,
    effects,
    ...(keywords.length ? { keywords } : {}),
    plus,
    tier: rare ? 'rare' : 'uncommon',
    source: 'echo',
    flavor: rng.pick(FLAVOR[trait]),
    art: { glyph: 'sigil', hue: AFFINITY_HUE[affinity] },
    hour,
  };
}
