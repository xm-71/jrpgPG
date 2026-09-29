import type { CardDef, FoeFamily, Look } from '@duskline/core';
import { enemySvg } from './enemy';
import { figureSvg } from './figure';
import { BLOOD, BONE, INK, ROMAN } from './palette';
import { sigil } from './sigil';

/**
 * Card art: a dark window tinted by the card's affinity, the card's own sigil behind, and a
 * line-art glyph in front: a Fade for bound cards, the hero for ultimates, a tool or keepsake
 * otherwise. Echoes show only their sigil and the hour that names them.
 */

const L = `stroke="${BONE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;

/** Line-art glyphs in a 100 x 100 box. */
const GLYPHS: Record<string, string> = {
  lantern: `<path d="M40 30 C42 20 58 20 60 30" fill="none" ${L}/><rect x="36" y="32" width="28" height="42" rx="6" fill="${INK}" ${L}/><rect x="44" y="40" width="12" height="26" rx="4" fill="${BONE}" opacity=".85"/><path d="M34 78 L66 78" ${L}/>`,
  blade: `<path d="M30 78 L70 22 L76 26 L38 82 Z" fill="${INK}" ${L}/><path d="M24 70 L44 86" ${L}/><path d="M36 72 L64 32" stroke="${BLOOD}" stroke-width="2"/>`,
  shield: `<path d="M50 18 L78 28 C78 58 68 76 50 86 C32 76 22 58 22 28 Z" fill="${INK}" ${L}/><path d="M50 28 L50 76 M34 42 L66 42" stroke="${BLOOD}" stroke-width="2"/>`,
  ash: `<path d="M26 74 C34 60 44 66 50 56 C56 66 66 60 74 74 Z" fill="${INK}" ${L}/><path d="M40 50 C38 40 46 34 44 24 M56 48 C60 38 54 32 58 22" fill="none" ${L} opacity=".6"/>`,
  rail: `<path d="M22 76 L78 34" ${L} stroke-width="7"/><path d="M22 76 L78 34" stroke="${BLOOD}" stroke-width="2"/><circle cx="78" cy="34" r="7" fill="${INK}" ${L}/>`,
  needle: `<path d="M28 80 L72 22" ${L}/><path d="M72 14 L78 28 L66 28 Z" fill="${INK}" ${L}/><path d="M36 60 L48 64 M44 50 L56 54" stroke="${BLOOD}" stroke-width="2"/>`,
  greatsword: `<path d="M44 84 L54 16 L64 18 L58 86 Z" fill="${INK}" ${L}/><path d="M34 80 L70 84" ${L}/><path d="M56 26 L52 74" stroke="${BLOOD}" stroke-width="2"/>`,
  kite: `<path d="M50 14 L72 46 L50 80 L28 46 Z" fill="${INK}" ${L}/><path d="M50 14 L50 80 M28 46 L72 46" stroke="${BLOOD}" stroke-width="1.6"/><path d="M50 80 C44 88 56 92 48 98" fill="none" ${L}/>`,
  staff: `<path d="M50 92 L50 30" ${L}/><circle cx="50" cy="24" r="10" fill="${INK}" ${L}/><circle cx="50" cy="24" r="4" fill="${BLOOD}"/>`,
  bow: `<path d="M34 16 C66 34 66 66 34 84" fill="none" ${L}/><path d="M34 16 L34 84" stroke="${BLOOD}" stroke-width="1.6"/>`,
  orb: `<circle cx="50" cy="50" r="20" fill="${INK}" ${L}/><path d="M42 40 A12 12 0 0 1 58 38" fill="none" ${L} opacity=".6"/><circle cx="50" cy="50" r="30" stroke="${BLOOD}" stroke-width="1.2" fill="none" stroke-dasharray="3 4"/>`,
  anchor: `<path d="M50 20 L50 80 M34 34 L66 34 M26 64 C28 82 50 86 50 80 C50 86 72 82 74 64" fill="none" ${L}/><circle cx="50" cy="18" r="6" fill="${INK}" ${L}/>`,
  compass: `<circle cx="50" cy="50" r="28" fill="${INK}" ${L}/><path d="M50 26 L58 50 L50 74 L42 50 Z" fill="${BONE}" opacity=".85"/><path d="M50 26 L58 50 L42 50 Z" fill="${BLOOD}"/>`,
  scroll: `<rect x="26" y="36" width="48" height="28" rx="4" fill="${INK}" ${L}/><path d="M34 46 L66 46 M34 54 L58 54" stroke="${BLOOD}" stroke-width="2"/>`,
  wire: `<path d="M22 78 L38 60 L30 50 L52 36 L44 26 L70 16" fill="none" ${L}/><circle cx="72" cy="15" r="5" fill="${BLOOD}"/>`,
  trowel: `<path d="M30 78 L54 44 L76 84 L42 86 Z" fill="${INK}" ${L}/><path d="M22 70 L34 58" ${L} stroke-width="6"/>`,
  coat: `<path d="M26 30 L42 22 L58 22 L74 30 L80 84 L62 84 L60 56 L40 56 L38 84 L20 84 Z" fill="${INK}" ${L}/><path d="M50 24 L50 84" stroke="${BLOOD}" stroke-width="2"/>`,
  biscuit: `<rect x="24" y="30" width="52" height="40" rx="10" fill="${INK}" ${L}/><circle cx="38" cy="44" r="3" fill="${BONE}"/><circle cx="52" cy="56" r="3" fill="${BONE}"/><circle cx="64" cy="42" r="3" fill="${BONE}"/>`,
  whistle: `<path d="M20 52 L60 40 C76 38 80 62 66 68 L32 70 C24 70 20 62 20 52 Z" fill="${INK}" ${L}/><circle cx="62" cy="54" r="4" fill="${BLOOD}"/>`,
  ledger: `<rect x="28" y="18" width="44" height="62" rx="4" fill="${INK}" ${L}/><path d="M38 18 L38 80 M46 34 L64 34 M46 44 L64 44 M46 54 L58 54" stroke="${BLOOD}" stroke-width="2"/>`,
  chime: `<path d="M50 14 L50 26 M50 26 C30 26 30 56 26 70 L74 70 C70 56 70 26 50 26 Z" fill="${INK}" ${L}/><circle cx="50" cy="76" r="4" fill="${BLOOD}"/>`,
  ribbon: `<path d="M18 44 C32 26 44 60 58 44 C68 32 76 40 80 46 L80 64 C74 58 68 52 58 62 C44 78 32 46 18 62 Z" fill="${INK}" ${L}/>`,
  sun: `<circle cx="50" cy="50" r="18" fill="${INK}" ${L}/><circle cx="50" cy="50" r="8" fill="${BLOOD}"/><path d="M50 16 L50 26 M50 74 L50 84 M16 50 L26 50 M74 50 L84 50 M26 26 L33 33 M67 67 L74 74 M74 26 L67 33 M33 67 L26 74" ${L}/>`,
  key: `<circle cx="36" cy="40" r="13" fill="${INK}" ${L}/><circle cx="36" cy="40" r="4" fill="${BLOOD}"/><path d="M46 48 L80 76 M68 66 L62 76 M76 72 L70 82" fill="none" ${L}/>`,
};

export interface CardArtOptions {
  /** The hero's look, for ultimates that show the hero. */
  heroLook?: Look;
}

/** Nest a whole SVG document inside another at a given box, replacing its own size. */
function innerSvg(svg: string, x: number, y: number, w: number, h: number): string {
  const end = svg.indexOf('>');
  const open = svg
    .slice(0, end)
    .replace(/ (width|height)="[^"]*"/g, '')
    .replace(' xmlns="http://www.w3.org/2000/svg"', '');
  return `${open} x="${x}" y="${y}" width="${w}" height="${h}"${svg.slice(end)}`;
}

/** SVG for a card's art window, 160 x 120. */
export function cardArtSvg(def: CardDef, opts: CardArtOptions = {}): string {
  const hue = def.art.hue;
  const neutral = def.affinity === null;
  const glow = `hsl(${hue} ${neutral ? 18 : 55}% ${neutral ? 24 : 30}%)`;
  const tint = `hsl(${hue} ${neutral ? 20 : 60}% ${neutral ? 62 : 64}%)`;
  const g = def.art.glyph;
  let front = '';
  if (g.startsWith('fade:')) front = innerSvg(enemySvg(g.slice(5) as FoeFamily), 40, 14, 80, 96);
  else if (g.startsWith('hero:') && opts.heroLook) front = innerSvg(figureSvg(opts.heroLook, { crop: 'half', noShadow: true }), 36, 4, 88, 136);
  else if (g.startsWith('prop:')) front = `<g transform="translate(35 15) scale(0.9)">${GLYPHS[g.slice(5)] ?? ''}</g>`;
  else if (GLYPHS[g]) front = `<g transform="translate(35 15) scale(0.9)">${GLYPHS[g]}</g>`;
  const hour = def.hour ? `<text x="80" y="112" text-anchor="middle" font-family="serif" font-size="11" fill="${BONE}" opacity=".8" letter-spacing="2">${ROMAN[def.hour - 1]}</text>` : '';
  const sigilOpacity = g === 'sigil' ? 0.95 : 0.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160" height="120">
  <defs>
    <radialGradient id="bg" cx="50%" cy="46%" r="70%">
      <stop offset="0" stop-color="${glow}"/>
      <stop offset="1" stop-color="${INK}"/>
    </radialGradient>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".04"/></pattern>
  </defs>
  <rect width="160" height="120" fill="url(#bg)"/>
  <g transform="translate(24 4) scale(1.12)" opacity="${sigilOpacity}">${sigil(def.id, tint, { ...(def.hour ? { hour: def.hour } : {}), numerals: g === 'sigil' })}</g>
  ${front}
  ${hour}
  <rect width="160" height="120" fill="url(#grain)"/>
</svg>`;
}
