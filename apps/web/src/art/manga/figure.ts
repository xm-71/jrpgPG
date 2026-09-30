import type { Look, Mood } from '@duskline/core';
import { shade } from '../color';
import { CANVAS_H, CANVAS_W, body, skeleton, type Skel } from './body';
import { brows, ears, face, headPath, manpu } from './face';
import { r1 } from './geom';
import { hair } from './hair';
import { headwear } from './headwear';
import { INK, Sheet } from './ink';
import { STYLES, type EyeKind, type StyleSpec } from './styles';

/**
 * A hero, drawn in the manga tradition their `Look` names, in colour with manga inking.
 * Layers go back to front: capes and long hair, legs, torso, costume, the head (skin, face,
 * bangs, brows, hats), arms, props. A filter then lays one heavy ink line around the whole
 * silhouette with a rim of accent light on the right, the side the stuck sun is on.
 */

export type Crop = 'full' | 'bust' | 'half' | 'face';

export interface FigureOptions {
  /** 'full' is the whole body; 'bust' head and shoulders; 'half' head to hips; 'face' a tight square for small avatars. */
  crop?: Crop;
  mood?: Mood;
  /** Skip the ground shadow. */
  noShadow?: boolean;
}

/** Traditions where brows are drawn over the bangs, as manga often does. */
const BROWS_OVER = new Set<EyeKind>(['shonen', 'chibi', 'showa', 'majokko', 'sanpaku', 'almond', 'shoujo']);

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cropBox(spec: StyleSpec, sk: Skel, crop: Crop): Box {
  const cx = CANVAS_W / 2;
  if (crop === 'full') return { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
  const u = sk.u;
  if (crop === 'face') {
    const w = spec.headW * u * 1.45;
    const cy = sk.top + spec.eyeY * u + 0.06 * u;
    return { x: cx - w / 2, y: cy - w * 0.52, w, h: w };
  }
  if (crop === 'bust') {
    const w = Math.min(CANVAS_W, Math.max(spec.headW * u * 2.3, u * 1.9));
    return { x: cx - w / 2, y: sk.top - (spec.eye === 'chibi' ? 0.45 : 0.3) * u, w, h: w / 0.931 };
  }
  const y = sk.top - 0.32 * u;
  const h = Math.min(CANVAS_H - y, sk.hip + 0.35 * u - y);
  const w = h * 0.652;
  return { x: cx - w / 2, y, w, h };
}

export function mangaFigure(look: Look, o: FigureOptions = {}): string {
  const spec = STYLES[look.style];
  const sk = skeleton(spec, look);
  const u = sk.u;
  const crop = o.crop ?? 'full';
  const mood = o.mood ?? 'calm';
  const box = cropBox(spec, sk, crop);
  const k = box.w / CANVAS_W;
  const s = new Sheet('m', Math.max(0.35, k), spec.shading);
  const L = body(s, spec, look, sk);
  const hr = hair(s, spec, look, u, `${look.style}:${look.hairColor}`);
  const f = { s, spec, look, mood, u };
  const head = headPath(spec, u);
  const at = (inner: string): string => `<g transform="translate(${CANVAS_W / 2} ${r1(sk.top)}) rotate(${spec.tilt} 0 ${r1(u)})">${inner}</g>`;

  // The bangs cast a shadow on the forehead.
  const clip = s.uid('f');
  const fringeShadow = hr.fringe ? `<clipPath id="${clip}"><path d="${head}"/></clipPath><g clip-path="url(#${clip})"><g transform="translate(${r1(0.02 * u)} ${r1(0.05 * u)})">${s.castShadow(hr.fringe, look.skin, 0.9)}</g></g>` : '';
  const over = BROWS_OVER.has(spec.eye);
  const headSvg = at(ears(s, spec, look, u) + s.shaded(head, look.skin, { off: 0.07 * u, line: 1.5 * spec.line }) + fringeShadow + face(f) + (over ? '' : brows(f)) + hr.front + (over ? brows(f) : '') + headwear(s, spec, look, u));

  const lineK = Math.max(0.45, k);
  const R = 1.7 * spec.line * lineK;
  const rim = look.accent;
  const filter = `<filter id="m-sil" x="-10%" y="-6%" width="120%" height="112%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r1(R)}" result="d"/>
  <feFlood flood-color="${INK}"/><feComposite in2="d" operator="in" result="o"/>
  <feMorphology in="SourceAlpha" operator="dilate" radius="${r1(R + 1.3 * lineK)}" result="d2"/>
  <feOffset in="d2" dx="${r1(1.8 * lineK)}" dy="${r1(-0.6 * lineK)}" result="d3"/>
  <feFlood flood-color="${rim}" flood-opacity=".9"/><feComposite in2="d3" operator="in" result="r"/>
  <feMerge><feMergeNode in="r"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;

  const ground = crop === 'full' && !o.noShadow ? `<ellipse cx="${CANVAS_W / 2}" cy="${r1(sk.foot)}" rx="${r1(Math.max(sk.hipW * 1.6, 40))}" ry="7" fill="#000" opacity=".45"/>` : '';
  const figure = `<g filter="url(#m-sil)">${L.back.join('')}${at(hr.back)}${L.legs.join('')}${L.torso.join('')}${L.over.join('')}${headSvg}${L.arms.join('')}${L.front.join('')}</g>`;
  const w = Math.round(box.w / k);
  const h = Math.round(box.h / k);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(box.x)} ${r1(box.y)} ${r1(box.w)} ${r1(box.h)}" width="${w}" height="${h}">${s.defs()}<defs>${filter}</defs>${ground}${L.glow.join('')}${figure}${at(manpu(f))}</svg>`;
}

/** The skin tone a hero's shadows use; handy for UI that wants to match. */
export const shadowOf = (look: Look): string => shade(look.skin, -0.24);
