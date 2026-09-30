import type { Affinity } from '../types';

/**
 * Card combat, in the spirit of a tower deckbuilder: a fresh hand of three every turn, a small pool
 * of Light, and one decision per card. Play it to strike, or hold it and it wards you through the
 * foes' turn. Either way the card is used up for the turn.
 */

export type StatusId = 'burn' | 'chill' | 'hex' | 'shock' | 'rage' | 'dim';
export const STATUSES: readonly StatusId[] = ['burn', 'chill', 'hex', 'shock', 'rage', 'dim'];

/** strike: made to be played. guard: made to be held. balanced: either. rite: effects. curse: dead weight. */
export type CardKind = 'strike' | 'guard' | 'balanced' | 'rite' | 'curse';
export type CardTarget = 'foe' | 'allFoes' | 'self';
export type CardTier = 'basic' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardSource = 'basic' | 'pool' | 'hero' | 'bound' | 'kindling' | 'ultimate' | 'curse' | 'echo';

/**
 * fleeting: gone at the end of the turn if still in hand, so it cannot ward.
 * spent: removed for the rest of the fight once played.
 * unplayable: cannot be played; thrown away at the end of the turn.
 * pierce: ignores a foe's ward.
 * linked: continues any Chain, whatever its affinity.
 * steadfast: stays in your hand after it wards, instead of being discarded.
 */
export type Keyword = 'fleeting' | 'spent' | 'unplayable' | 'pierce' | 'linked' | 'steadfast';

export type CardEffect =
  | { type: 'status'; status: StatusId; stacks: number; on?: 'target' | 'allFoes' | 'self' }
  | { type: 'heal'; amount: number }
  | { type: 'draw'; count: number }
  | { type: 'light'; amount: number }
  | { type: 'ward'; amount: number }
  /** Chip Shell even without a weakness. */
  | { type: 'crack'; amount: number }
  | { type: 'gauge'; amount: number }
  | { type: 'cleanse' };

export interface CardArt {
  /** A glyph name the client knows how to draw, or 'fade:<family>' for bound Fades. */
  glyph: string;
  hue: number;
}

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  affinity: Affinity | null;
  target: CardTarget;
  /** Light to play it. */
  cost: number;
  /** Damage per hit when played. */
  atk: number;
  hits?: number;
  /** Ward it gives while held at the end of your turn. */
  ward: number;
  effects?: CardEffect[];
  keywords?: Keyword[];
  /** What changes when the card is tempered. */
  plus?: Partial<Pick<CardDef, 'cost' | 'atk' | 'hits' | 'ward' | 'effects' | 'keywords'>>;
  tier: CardTier;
  source: CardSource;
  /** Kindling rarity, for cards that can be kindled. */
  stars?: 3 | 4 | 5;
  /** Signature cards only turn up for their hero. */
  hero?: string;
  flavor: string;
  art: CardArt;
  /** Echo cards: the hour on the sundial that names them, 1 to 12. */
  hour?: number;
}

/** A card in a deck. Two copies of one card are two instances. */
export interface CardInstance {
  uid: number;
  id: string;
  /** Tempered. */
  up?: boolean;
}

/** The numbers a card instance actually plays with. */
export interface CardStats {
  cost: number;
  atk: number;
  hits: number;
  ward: number;
  effects: CardEffect[];
  keywords: Keyword[];
}

export function cardStats(def: CardDef, up = false): CardStats {
  const p = up && def.plus ? def.plus : {};
  return {
    cost: Math.max(0, p.cost ?? def.cost),
    atk: p.atk ?? def.atk,
    hits: Math.max(1, p.hits ?? def.hits ?? 1),
    ward: p.ward ?? def.ward,
    effects: p.effects ?? def.effects ?? [],
    keywords: p.keywords ?? def.keywords ?? [],
  };
}

export const hasKeyword = (s: CardStats, k: Keyword): boolean => s.keywords.includes(k);

/**
 * Small numeric modifiers from hero traits, Glimmers and Resonance. One vocabulary for all of
 * them, so the text, the engine and the simulator agree.
 */
export type Passive =
  | { type: 'maxHp'; value: number }
  | { type: 'maxLight'; value: number }
  | { type: 'handLimit'; value: number }
  /** Outgoing damage, as a fraction: 0.1 is +10%. */
  | { type: 'damage'; pct: number }
  | { type: 'affinityDamage'; affinity: Affinity; pct: number }
  /** Extra ward for every card held at the end of a turn. */
  | { type: 'heldWard'; value: number }
  | { type: 'startWard'; value: number }
  /** The first card played each turn deals this much more per hit. */
  | { type: 'firstStrike'; value: number }
  | { type: 'breakDraw'; value: number }
  | { type: 'breakHeal'; value: number }
  | { type: 'breakWard'; value: number }
  | { type: 'shellBonus'; value: number }
  /** Extra damage per Chain step, as a fraction. */
  | { type: 'chainBonus'; pct: number }
  | { type: 'gaugeGain'; pct: number }
  | { type: 'startGauge'; value: number }
  | { type: 'healPower'; pct: number }
  /** Every foe starts the fight with this status. */
  | { type: 'startStatus'; status: StatusId; stacks: number }
  /** Burn you apply is this much stronger. */
  | { type: 'burnPower'; value: number }
  | { type: 'openingLight'; value: number }
  | { type: 'openingDraw'; value: number }
  /** Run only: heal after every won fight. */
  | { type: 'victoryHeal'; value: number }
  /** Run only: more Embers from fights, as a fraction. */
  | { type: 'emberGain'; pct: number };

export type PassiveType = Passive['type'];

/** Sum a numeric passive. */
export function passiveSum(passives: readonly Passive[], type: Exclude<PassiveType, 'affinityDamage' | 'startStatus'>): number {
  let total = 0;
  for (const p of passives) {
    if (p.type !== type) continue;
    total += 'pct' in p ? p.pct : 'value' in p ? p.value : 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Foes
// ---------------------------------------------------------------------------

export type FoeTier = 'mob' | 'elite' | 'boss';

/** One thing a foe can do on its turn. Parts combine: an attack that also chills, a ward for the whole pack. */
export interface FoeMove {
  id: string;
  name: string;
  dmg?: number;
  hits?: number;
  pierce?: boolean;
  /** Ward for itself, or for every foe. */
  ward?: number;
  wardAll?: number;
  rage?: number;
  rageAll?: number;
  heal?: number;
  healAll?: number;
  /** A status put on the hero. */
  afflict?: { status: StatusId; stacks: number };
  /** Ash cards shuffled into your discard pile. */
  curse?: number;
  /** Breaks the ward your best held card gave you, before any attack lands. */
  shatter?: boolean;
  /** A foe id that joins the fight. */
  summon?: string;
}

export interface FoeSetup {
  id: string;
  defId: string;
  name: string;
  family: string;
  tier: FoeTier;
  hp: number;
  shell: number;
  weaknesses: Affinity[];
  resists: Affinity[];
  moves: FoeMove[];
  /** Moves in order, repeating. Otherwise picked by weight. */
  pattern?: string[];
  weights?: Record<string, number>;
  /** First move, before the pattern or weights take over. */
  opener?: string;
  /** Scales damage, ward and healing, for deeper floors. */
  power: number;
}

export interface HeroSetup {
  id: string;
  name: string;
  affinity: Affinity;
  maxHp: number;
  hp: number;
  maxLight: number;
  handLimit: number;
  /** Card id conjured into your hand when the gauge fills. */
  ultimate: string | null;
  ultimateUp?: boolean;
  passives: Passive[];
}

export interface BattleSetup {
  hero: HeroSetup;
  deck: CardInstance[];
  /** Every card the fight can reference: the deck, the ultimate and Ash. */
  cards: Record<string, CardDef>;
  foes: FoeSetup[];
  /** Foes that can be summoned mid-fight, by id. */
  summons?: Record<string, FoeSetup>;
}

export type CardAction = { type: 'play'; uid: number; target?: string } | { type: 'end' };
