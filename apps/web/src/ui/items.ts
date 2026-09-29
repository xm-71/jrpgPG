import type { CardDef } from '@duskline/core';
import { cardById, heroById } from '@duskline/content';
import { cardArtUrl, heroUrl } from './Art';

export interface ItemView {
  id: string;
  name: string;
  kind: 'hero' | 'card';
  rarity: 3 | 4 | 5;
  url: string;
  sub: string;
  card?: CardDef;
}

/** Display facts for anything Kindling can give. */
export function itemView(id: string): ItemView {
  const h = heroById(id);
  if (h) return { id, name: h.name, kind: 'hero', rarity: h.rarity as 3 | 4 | 5, url: heroUrl(h, 'half'), sub: h.title };
  const c = cardById(id);
  if (c) return { id, name: c.name, kind: 'card', rarity: (c.stars ?? 3) as 3 | 4 | 5, url: cardArtUrl(c), sub: 'Kindled card', card: c };
  return { id, name: id, kind: 'card', rarity: 3, url: '', sub: '' };
}
