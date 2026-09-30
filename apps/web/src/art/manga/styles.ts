import type { MangaStyle } from '@duskline/core';
import type { Shading } from './ink';

/**
 * The manga traditions the cast is drawn in. Each one sets proportions (how many heads tall),
 * the shape of the face, the eyes, nose and brows, the weight of the ink and how shadows are
 * laid in. The research behind each is in the style guide; the short version is in `about`.
 */

export type EyeKind = 'shonen' | 'rival' | 'sanpaku' | 'almond' | 'bishonen' | 'chibi' | 'seinen' | 'showa' | 'shoujo' | 'gekiga' | 'majokko' | 'yokai';
export type NoseKind = 'tip' | 'line' | 'long' | 'dot' | 'full' | 'button' | 'hook' | 'none';
export type BrowKind = 'thick' | 'thin' | 'sharp' | 'heavy' | 'natural' | 'arc' | 'stub';

export interface StyleSpec {
  name: string;
  /** One line on what the tradition is and what we took from it. */
  about: string;
  /** Height of the whole figure in head heights. */
  heads: number;
  /** Head width as a fraction of head height. */
  headW: number;
  /** 0 is a tapering jaw, 1 is a square one. */
  jaw: number;
  /** 0 is a round chin, 1 a sharp point. */
  chin: number;
  /** Eye line, as a fraction of the head from the top. Lower eyes read younger. */
  eyeY: number;
  /** Half the distance between the eyes, in head heights. */
  eyeX: number;
  eyeW: number;
  eyeH: number;
  eye: EyeKind;
  nose: NoseKind;
  brow: BrowKind;
  mouthW: number;
  /** Shoulder width in head widths. */
  shoulders: number;
  waist: number;
  hips: number;
  /** Neck length in head heights. */
  neck: number;
  /** Ink weight multiplier. */
  line: number;
  shading: Shading;
  /** Head tilt in degrees; positive tips the chin down. */
  tilt: number;
  /** How this tradition shows anger: a popping vein, or a shadow falling over the eyes. */
  anger: 'vein' | 'shadow';
  /** Sparkles and flowers when happy. */
  sparkle: boolean;
}

export const STYLES: Record<MangaStyle, StyleSpec> = {
  shonen: {
    name: 'Shonen lead',
    about: 'The hero of a weekly battle manga: big determined eyes, a mop of spikes with one stubborn strand, a scarf that is always in the wind.',
    heads: 6.2, headW: 0.84, jaw: 0.3, chin: 0.5, eyeY: 0.56, eyeX: 0.2, eyeW: 0.2, eyeH: 0.17,
    eye: 'shonen', nose: 'tip', brow: 'thick', mouthW: 0.16,
    shoulders: 2.0, waist: 1.35, hips: 1.45, neck: 0.22, line: 1.1, shading: 'dots', tilt: -3, anger: 'vein', sparkle: false,
  },
  rival: {
    name: 'Shonen rival',
    about: 'The cool swordswoman who stands apart: narrow, half-lidded eyes, a hime cut with blunt bangs, a long coat and very few words.',
    heads: 7.2, headW: 0.78, jaw: 0.25, chin: 0.75, eyeY: 0.54, eyeX: 0.19, eyeW: 0.2, eyeH: 0.12,
    eye: 'rival', nose: 'line', brow: 'thin', mouthW: 0.12,
    shoulders: 1.95, waist: 1.25, hips: 1.45, neck: 0.3, line: 1.0, shading: 'dots', tilt: 4, anger: 'shadow', sparkle: false,
  },
  sukeban: {
    name: 'Sukeban',
    about: 'The delinquent boss of yankii manga: a regent quiff, a coat worn on the shoulders like a cape, a plaster on the cheek and a glare with white under the iris.',
    heads: 7.0, headW: 0.8, jaw: 0.38, chin: 0.6, eyeY: 0.54, eyeX: 0.19, eyeW: 0.19, eyeH: 0.12,
    eye: 'sanpaku', nose: 'tip', brow: 'sharp', mouthW: 0.15,
    shoulders: 2.05, waist: 1.3, hips: 1.55, neck: 0.28, line: 1.15, shading: 'dots', tilt: -5, anger: 'vein', sparkle: false,
  },
  kunoichi: {
    name: 'Kunoichi',
    about: 'The ninja scout of action manga: a masked face so the eyes do all the talking, bound sleeves, a headband with long tails, needles fanned between the fingers.',
    heads: 6.8, headW: 0.8, jaw: 0.28, chin: 0.7, eyeY: 0.54, eyeX: 0.19, eyeW: 0.2, eyeH: 0.14,
    eye: 'almond', nose: 'none', brow: 'thin', mouthW: 0.12,
    shoulders: 1.85, waist: 1.2, hips: 1.5, neck: 0.28, line: 1.0, shading: 'dots', tilt: 0, anger: 'shadow', sparkle: false,
  },
  bishonen: {
    name: 'Bishonen',
    about: 'The elegant knight of 1990s fantasy manga: impossibly long limbs, a pointed chin, long-lashed narrow eyes, flowing hair and baroque armour.',
    heads: 8.4, headW: 0.74, jaw: 0.22, chin: 0.9, eyeY: 0.52, eyeX: 0.19, eyeW: 0.22, eyeH: 0.1,
    eye: 'bishonen', nose: 'long', brow: 'thin', mouthW: 0.11,
    shoulders: 2.15, waist: 1.2, hips: 1.3, neck: 0.38, line: 0.85, shading: 'soft', tilt: 3, anger: 'shadow', sparkle: true,
  },
  chibi: {
    name: 'Chibi',
    about: 'Super-deformed comedy: two and a half heads tall, eyes half the face, mitten hands, and every feeling written on the outside.',
    heads: 2.6, headW: 0.98, jaw: 0.1, chin: 0.15, eyeY: 0.6, eyeX: 0.21, eyeW: 0.22, eyeH: 0.27,
    eye: 'chibi', nose: 'none', brow: 'stub', mouthW: 0.14,
    shoulders: 1.0, waist: 0.95, hips: 1.0, neck: 0.02, line: 1.25, shading: 'flat', tilt: -4, anger: 'vein', sparkle: true,
  },
  seinen: {
    name: 'Seinen',
    about: 'Dark fantasy for adult readers: real proportions, a weathered face with small eyes and a real nose, and shadows built from hatching.',
    heads: 7.6, headW: 0.76, jaw: 0.55, chin: 0.5, eyeY: 0.5, eyeX: 0.19, eyeW: 0.16, eyeH: 0.075,
    eye: 'seinen', nose: 'full', brow: 'natural', mouthW: 0.15,
    shoulders: 2.2, waist: 1.4, hips: 1.55, neck: 0.3, line: 0.95, shading: 'hatch', tilt: 2, anger: 'shadow', sparkle: false,
  },
  showa: {
    name: 'Showa classic',
    about: 'The round, bold look of 1950s and 60s manga: big round eyes with a white wedge of light, a button nose, even lines and flat colour.',
    heads: 4.6, headW: 0.92, jaw: 0.12, chin: 0.25, eyeY: 0.55, eyeX: 0.2, eyeW: 0.2, eyeH: 0.23,
    eye: 'showa', nose: 'button', brow: 'arc', mouthW: 0.16,
    shoulders: 1.45, waist: 1.2, hips: 1.3, neck: 0.12, line: 1.35, shading: 'flat', tilt: 0, anger: 'vein', sparkle: false,
  },
  shoujo: {
    name: 'Classic shoujo',
    about: 'The 1970s girls’ manga heroine in a gallant officer’s coat: starry eyes with many lights, long lashes, cascading curls, sparkles and roses.',
    heads: 7.8, headW: 0.76, jaw: 0.22, chin: 0.8, eyeY: 0.56, eyeX: 0.2, eyeW: 0.22, eyeH: 0.23,
    eye: 'shoujo', nose: 'dot', brow: 'thin', mouthW: 0.11,
    shoulders: 1.9, waist: 1.1, hips: 1.45, neck: 0.36, line: 0.8, shading: 'soft', tilt: 3, anger: 'shadow', sparkle: true,
  },
  gekiga: {
    name: 'Gekiga',
    about: '“Dramatic pictures”: the realist manga of the 1960s and 70s. A square jaw, eyes deep under a heavy brow, and shadows in solid black.',
    heads: 7.4, headW: 0.82, jaw: 0.85, chin: 0.35, eyeY: 0.48, eyeX: 0.2, eyeW: 0.15, eyeH: 0.06,
    eye: 'gekiga', nose: 'full', brow: 'heavy', mouthW: 0.17,
    shoulders: 2.75, waist: 1.9, hips: 1.8, neck: 0.28, line: 1.2, shading: 'beta', tilt: 0, anger: 'shadow', sparkle: false,
  },
  majokko: {
    name: 'Majokko',
    about: 'The little witch at the root of magical girl manga: twin tails, a pointed hat, ribbons and frills, and a star caught in each eye.',
    heads: 5.2, headW: 0.88, jaw: 0.18, chin: 0.45, eyeY: 0.58, eyeX: 0.21, eyeW: 0.21, eyeH: 0.23,
    eye: 'majokko', nose: 'dot', brow: 'thin', mouthW: 0.12,
    shoulders: 1.5, waist: 1.1, hips: 1.5, neck: 0.16, line: 1.0, shading: 'soft', tilt: -2, anger: 'vein', sparkle: true,
  },
  yokai: {
    name: 'Yokai manga',
    about: 'Folklore manga of ghosts and spirits: a simple, slightly uncanny figure with one eye hidden by hair, a paper lantern, and shadows built dot by dot.',
    heads: 6.0, headW: 0.8, jaw: 0.28, chin: 0.6, eyeY: 0.54, eyeX: 0.2, eyeW: 0.17, eyeH: 0.16,
    eye: 'yokai', nose: 'hook', brow: 'thin', mouthW: 0.13,
    shoulders: 1.8, waist: 1.3, hips: 1.5, neck: 0.24, line: 1.0, shading: 'stipple', tilt: 2, anger: 'shadow', sparkle: false,
  },
};
