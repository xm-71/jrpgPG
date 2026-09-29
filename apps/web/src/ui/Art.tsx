import type { CardDef, FoeDef, HeroDef, Mood } from '@duskline/core';
import { heroById } from '@duskline/content';
import type { JSX } from 'preact';
import { cardArtSvg } from '../art/cardArt';
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

export type Crop = 'full' | 'bust' | 'half' | 'face';

export const MOODS: readonly Mood[] = ['calm', 'fierce', 'hurt', 'smile', 'shock'];

export const heroUrl = (h: HeroDef, crop: Crop = 'bust', mood: Mood = 'calm'): string =>
  memo(`hero:${h.id}:${crop}:${mood}`, () => figureSvg(h.look, { crop, mood, noShadow: crop !== 'full' }));
export const foeUrl = (f: Pick<FoeDef, 'family'>, halo = false): string => memo(`foe:${f.family}:${halo}`, () => enemySvg(f.family, { halo }));

export function cardArtUrl(c: CardDef): string {
  return memo(`card:${c.id}`, () => {
    const hero = c.art.glyph.startsWith('hero:') ? heroById(c.art.glyph.slice(5)) : undefined;
    return cardArtSvg(c, hero ? { heroLook: hero.look } : {});
  });
}

export function HeroImg({ hero, crop = 'bust', mood = 'calm', class: cls = '' }: { hero: HeroDef; crop?: Crop; mood?: Mood; class?: string }): JSX.Element {
  return <img class={`art ${cls}`} src={heroUrl(hero, crop, mood)} alt="" draggable={false} />;
}

export function FoeImg({ foe, halo = false, class: cls = '' }: { foe: Pick<FoeDef, 'family'>; halo?: boolean; class?: string }): JSX.Element {
  return <img class={`art ${cls}`} src={foeUrl(foe, halo)} alt="" draggable={false} />;
}
