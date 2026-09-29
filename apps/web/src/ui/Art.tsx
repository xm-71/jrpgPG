import type { CardDef, EnemyDef, HeroDef } from '@duskline/core';
import type { JSX } from 'preact';
import { cardSvg } from '../art/cardArt';
import { enemySvg } from '../art/enemy';
import { figureSvg, svgUrl } from '../art/figure';

const cache = new Map<string, string>();

function memo(key: string, make: () => string): string {
  let hit = cache.get(key);
  if (!hit) {
    hit = svgUrl(make());
    cache.set(key, hit);
  }
  return hit;
}

export type Crop = 'full' | 'half' | 'bust';

export const heroUrl = (h: HeroDef, crop: Crop = 'bust'): string => memo(`hero:${h.id}:${crop}`, () => figureSvg(h.look, { crop, noShadow: crop !== 'full' }));
export const cardUrl = (c: CardDef): string => memo(`card:${c.id}`, () => cardSvg(c));
export const foeUrl = (e: EnemyDef): string => memo(`foe:${e.family}`, () => enemySvg(e.family));

export function HeroImg({ hero, crop = 'bust', class: cls = '' }: { hero: HeroDef; crop?: Crop; class?: string }): JSX.Element {
  return <img class={`art ${cls}`} src={heroUrl(hero, crop)} alt="" draggable={false} />;
}

export function CardImg({ card, class: cls = '' }: { card: CardDef; class?: string }): JSX.Element {
  return <img class={`art ${cls}`} src={cardUrl(card)} alt={card.name} draggable={false} />;
}

export function FoeImg({ enemy, class: cls = '' }: { enemy: EnemyDef; class?: string }): JSX.Element {
  return <img class={`art ${cls}`} src={foeUrl(enemy)} alt="" draggable={false} />;
}
