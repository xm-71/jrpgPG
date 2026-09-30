import type { Affinity, CardDef } from '@duskline/core';

/** Tint for card art by affinity. Neutral cards use a cold violet. */
export const AFFINITY_HUE: Record<Affinity | 'none', number> = {
  sun: 42,
  moon: 232,
  flame: 12,
  frost: 196,
  gale: 150,
  volt: 56,
  none: 268,
};

type CardInput = Omit<CardDef, 'art' | 'target' | 'affinity' | 'source'> &
  Partial<Pick<CardDef, 'target' | 'affinity' | 'source'>> & {
    /** Art glyph; defaults to a sigil. */
    glyph?: string;
  };

/** A card with sensible defaults: aimed at one foe, neutral, from the common pool. */
export function card(o: CardInput): CardDef {
  const { glyph, ...rest } = o;
  const affinity = o.affinity ?? null;
  return {
    target: 'foe',
    source: 'pool',
    ...rest,
    affinity,
    art: { glyph: glyph ?? 'sigil', hue: AFFINITY_HUE[affinity ?? 'none'] },
  };
}
