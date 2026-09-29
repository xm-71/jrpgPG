import type { PullRarity } from './types';

/** What the player owns from Kindling. Heroes rank up with duplicates; cards stack. */
export interface Collection {
  heroes: Record<string, { resonance: number }>;
  cards: Record<string, number>;
}

export const MAX_RESONANCE = 5;
export const MAX_CARD_COPIES = 5;

/** Gloam paid for a duplicate that can no longer rank anything up. */
export const DUPE_GLOAM = {
  hero: { 5: 250, 4: 100, 3: 40 },
  card: { 5: 80, 4: 40, 3: 15 },
} as const satisfies Record<'hero' | 'card', Record<PullRarity, number>>;

export interface ItemInfo {
  kind: 'hero' | 'card';
  rarity: PullRarity;
}

/** Looks up what an item id is. Provided by the content package. */
export type ItemCatalog = (id: string) => ItemInfo | undefined;

export interface ApplyOutcome {
  item: string;
  kind: 'hero' | 'card';
  rarity: PullRarity;
  /** First copy the player has ever had. */
  isNew: boolean;
  /** Resonance after the pull, for heroes. */
  resonance: number | null;
  /** Copies after the pull, for cards. */
  copies: number | null;
  /** Gloam paid because the duplicate was already at its maximum. */
  gloam: number;
}

export function newCollection(): Collection {
  return { heroes: {}, cards: {} };
}

/** Put a pulled item into the collection. Mutates `col`. */
export function applyPullInPlace(col: Collection, itemId: string, catalog: ItemCatalog): ApplyOutcome {
  const info = catalog(itemId);
  if (!info) throw new Error(`Unknown item: ${itemId}`);

  if (info.kind === 'hero') {
    const owned = col.heroes[itemId];
    if (!owned) {
      col.heroes[itemId] = { resonance: 1 };
      return { item: itemId, kind: 'hero', rarity: info.rarity, isNew: true, resonance: 1, copies: null, gloam: 0 };
    }
    if (owned.resonance < MAX_RESONANCE) {
      owned.resonance++;
      return { item: itemId, kind: 'hero', rarity: info.rarity, isNew: false, resonance: owned.resonance, copies: null, gloam: 0 };
    }
    return {
      item: itemId,
      kind: 'hero',
      rarity: info.rarity,
      isNew: false,
      resonance: owned.resonance,
      copies: null,
      gloam: DUPE_GLOAM.hero[info.rarity],
    };
  }

  const copies = col.cards[itemId] ?? 0;
  if (copies === 0) {
    col.cards[itemId] = 1;
    return { item: itemId, kind: 'card', rarity: info.rarity, isNew: true, resonance: null, copies: 1, gloam: 0 };
  }
  if (copies < MAX_CARD_COPIES) {
    col.cards[itemId] = copies + 1;
    return { item: itemId, kind: 'card', rarity: info.rarity, isNew: false, resonance: null, copies: copies + 1, gloam: 0 };
  }
  return {
    item: itemId,
    kind: 'card',
    rarity: info.rarity,
    isNew: false,
    resonance: null,
    copies,
    gloam: DUPE_GLOAM.card[info.rarity],
  };
}
