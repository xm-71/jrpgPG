import type { BattleSetup, CardDef, CardInstance, FoeSetup, HeroSetup } from './defs';
import { ASH_ID } from './rules';
import type { CardBattleState } from './state';

/** Hand-made cards and foes for engine tests. */

export function card(id: string, o: Partial<CardDef> = {}): CardDef {
  return {
    id,
    name: id,
    kind: 'balanced',
    affinity: null,
    target: 'foe',
    cost: 1,
    atk: 0,
    ward: 0,
    tier: 'common',
    source: 'pool',
    flavor: '',
    art: { glyph: 'sigil', hue: 0 },
    ...o,
  };
}

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  [
    card('cut', { kind: 'strike', atk: 6, ward: 1 }),
    card('brace', { kind: 'guard', atk: 2, ward: 6 }),
    card('sun', { kind: 'strike', affinity: 'sun', atk: 5, ward: 1 }),
    card('sun2', { kind: 'strike', affinity: 'sun', atk: 5, ward: 1, hits: 2 }),
    card('moon', { kind: 'strike', affinity: 'moon', atk: 5, ward: 1 }),
    card('link', { kind: 'balanced', atk: 5, ward: 1, keywords: ['linked'] }),
    card('big', { kind: 'strike', cost: 3, atk: 20, ward: 0 }),
    card('flash', { kind: 'strike', atk: 4, ward: 9, keywords: ['fleeting'] }),
    card('ember', { kind: 'strike', affinity: 'flame', atk: 2, ward: 0, effects: [{ type: 'status', status: 'burn', stacks: 3 }] }),
    card('frost', { kind: 'balanced', affinity: 'frost', atk: 2, ward: 2, effects: [{ type: 'status', status: 'chill', stacks: 1 }] }),
    card('hex', { kind: 'rite', affinity: 'moon', atk: 0, ward: 1, effects: [{ type: 'status', status: 'hex', stacks: 2 }] }),
    card('shock', { kind: 'rite', affinity: 'volt', cost: 0, atk: 0, ward: 0, effects: [{ type: 'status', status: 'shock', stacks: 5 }] }),
    card('pry', { kind: 'rite', cost: 1, atk: 0, ward: 0, effects: [{ type: 'crack', amount: 2 }] }),
    card('mend', { kind: 'rite', target: 'self', atk: 0, ward: 2, effects: [{ type: 'heal', amount: 8 }] }),
    card('ult', { kind: 'strike', cost: 0, atk: 15, ward: 0, source: 'ultimate', keywords: ['fleeting'] }),
    card(ASH_ID, { kind: 'curse', cost: 0, atk: 0, ward: 0, source: 'curse', keywords: ['unplayable'] }),
  ].map((c) => [c.id, c]),
);

export function foe(id: string, o: Partial<FoeSetup> = {}): FoeSetup {
  return {
    id,
    defId: id,
    name: id,
    family: 'wisp',
    tier: 'mob',
    hp: 30,
    shell: 2,
    weaknesses: ['sun'],
    resists: [],
    moves: [{ id: 'bite', name: 'Bite', dmg: 5 }],
    power: 1,
    ...o,
  };
}

export function hero(o: Partial<HeroSetup> = {}): HeroSetup {
  return { id: 'wren', name: 'Wren', affinity: 'sun', maxHp: 60, hp: 60, maxLight: 4, handLimit: 3, ultimate: null, passives: [], ...o };
}

export function deckOf(ids: readonly string[]): CardInstance[] {
  return ids.map((id, i) => ({ uid: i + 1, id }));
}

export function setupWith(o: { deck: string[]; foes?: FoeSetup[]; hero?: Partial<HeroSetup>; summons?: Record<string, FoeSetup> }): BattleSetup {
  return { hero: hero(o.hero), deck: deckOf(o.deck), cards: CARDS, foes: o.foes ?? [foe('wisp')], ...(o.summons ? { summons: o.summons } : {}) };
}

/** Put specific cards in hand, in order, and everything else in the draw pile. */
export function arrange(s: CardBattleState, handIds: readonly string[]): void {
  const all = [...s.hand, ...s.draw, ...s.discard];
  const hand: CardInstance[] = [];
  for (const id of handIds) {
    const i = all.findIndex((c) => c.id === id);
    if (i < 0) throw new Error(`No ${id} left to arrange`);
    hand.push(all.splice(i, 1)[0]!);
  }
  s.hand = hand;
  s.draw = all;
  s.discard = [];
}

export const uidOf = (s: CardBattleState, id: string): number => {
  const c = s.hand.find((x) => x.id === id);
  if (!c) throw new Error(`${id} is not in hand`);
  return c.uid;
};

/** Every card the fight knows about, wherever it is. */
export const allCards = (s: CardBattleState): CardInstance[] => [...s.draw, ...s.hand, ...s.discard, ...s.spent];
