import { cardById, heroById } from '@duskline/content';
import { cardUrl, heroUrl } from './Art';

export interface ItemView {
  id: string;
  name: string;
  kind: 'hero' | 'card';
  rarity: 3 | 4 | 5;
  url: string;
  sub: string;
}

/** Display facts for anything Kindling can give. */
export function itemView(id: string): ItemView {
  const h = heroById(id);
  if (h) return { id, name: h.name, kind: 'hero', rarity: h.rarity as 3 | 4 | 5, url: heroUrl(h, 'half'), sub: h.title };
  const c = cardById(id);
  if (c) return { id, name: c.name, kind: 'card', rarity: c.rarity as 3 | 4 | 5, url: cardUrl(c), sub: 'Memory Card' };
  return { id, name: id, kind: 'card', rarity: 3, url: '', sub: '' };
}
