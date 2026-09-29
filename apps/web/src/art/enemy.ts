import type { FoeFamily } from '@duskline/core';
import { BLOOD, GOLD, INK } from './palette';
import { sigil } from './sigil';

/**
 * Fades, drawn the way horror manga draws its monsters: pale paper bodies under a heavy ink line,
 * shadows built from hatching, eyes that are too wide with pupils that are too small, and the
 * odd spiral. They stay lit red from behind by the stuck sun. Each family keeps its own outline
 * so the threat reads at a glance.
 */

const PAPER: Record<FoeFamily, string> = {
  wisp: '#E9E3D3',
  hound: '#D9D0C0',
  wraith: '#E2DCD6',
  husk: '#D8CDB6',
  choir: '#E8E0D0',
  static: '#D3D1DA',
  warden: '#E6DDCB',
  moth: '#E0D8C6',
  acolyte: '#D6CBB8',
  bell: '#D6CCB4',
  keeper: '#E4DAC4',
};

const VOID = '#0E0A12';
const RED = '#E0443A';

/** A wide, pale eye with a pinprick pupil: the horror-manga stare. */
const stare = (x: number, y: number, rx = 7, ry = 8, pupil = RED): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#FBF5EA" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y + 0.5}" r="${Math.max(1.4, rx * 0.26)}" fill="${pupil}"/><circle cx="${x}" cy="${y + 0.5}" r="${Math.max(0.6, rx * 0.1)}" fill="${VOID}"/>`;

/** An eye that is only a glow in a black socket. */
const glint = (x: number, y: number, r = 3): string => `<circle cx="${x}" cy="${y}" r="${r + 2.5}" fill="${RED}" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="#FFB4A0"/>`;

/** A tight spiral, drawn as a polyline. */
function spiral(cx: number, cy: number, r: number, turns = 3): string {
  let d = '';
  const n = turns * 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = r * t;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
}

interface Drawing {
  /** The silhouette: shapes that take the paper fill and the ink line. */
  body: string;
  /** Voids, eyes and marks, drawn over the shading. */
  detail: string;
}

function draw(family: FoeFamily): Drawing {
  switch (family) {
    case 'wisp':
      return {
        body: `<path d="M120 24 C150 74 192 104 186 162 C182 216 152 250 120 256 C88 250 58 216 54 162 C48 104 90 74 120 24 Z"/>
          <path d="M60 170 C36 150 30 128 40 106 C52 122 66 130 70 150 Z"/>
          <path d="M180 170 C204 150 210 128 200 106 C188 122 174 130 170 150 Z"/>`,
        detail: `${stare(98, 150, 10, 12)}${stare(142, 150, 10, 12)}
          <path d="M92 190 Q120 214 150 188 Q138 204 120 206 Q100 204 92 190 Z" fill="${VOID}"/>
          ${spiral(120, 232, 12, 2.5)}`,
      };
    case 'hound':
      return {
        body: `<path d="M36 156 L56 124 L84 128 L118 116 L176 120 L212 146 L214 188 L232 254 L204 254 L188 208 L152 208 L142 254 L112 254 L120 208 L84 202 L66 254 L36 254 L52 196 Z"/>
          <path d="M36 156 L14 136 L28 108 L58 112 L72 126 Z"/>
          <path d="M58 112 L52 86 L74 106 Z M78 112 L84 88 L98 116 Z"/>
          <path d="M212 146 L240 116 L234 156 Z"/>
          <path d="M96 118 L102 104 L110 116 L118 100 L126 115 L136 100 L142 117 L152 102 L158 118 Z"/>`,
        detail: `${stare(50, 124, 6, 6)}
          <path d="M14 136 L40 148 L24 156 Z" fill="${VOID}"/>
          <path d="M18 138 L22 146 L26 140 L30 148 L34 142" fill="none" stroke="#FBF5EA" stroke-width="1.6"/>
          ${[0, 1, 2, 3].map((i) => `<path d="M${118 + i * 16} 130 Q${126 + i * 16} 160 ${116 + i * 16} 190" fill="none" stroke="${INK}" stroke-width="2"/>`).join('')}`,
      };
    case 'wraith':
      return {
        body: `<path d="M120 22 C152 26 172 56 170 94 C188 124 204 192 216 264 L188 246 L170 268 L150 246 L130 270 L112 246 L92 268 L72 246 L50 264 C64 192 80 124 96 94 C90 56 100 26 120 22 Z"/>
          <path d="M78 150 L40 196 L46 200 L86 166 Z M162 150 L200 196 L194 200 L154 166 Z"/>`,
        detail: `<path d="M98 64 C98 46 142 46 142 64 L142 104 C132 116 108 116 98 104 Z" fill="${VOID}"/>
          ${glint(110, 84)}${glint(130, 84)}
          <path d="M40 196 L30 214 M44 198 L38 218 M48 200 L46 220 M200 196 L210 214 M196 198 L202 218 M192 200 L194 220" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
      };
    case 'husk':
      return {
        body: `<path d="M44 96 L196 96 L214 266 L26 266 Z"/>
          <path d="M44 96 L26 60 L60 84 L82 40 L104 84 L136 36 L158 84 L190 56 L196 96 Z"/>
          <path d="M44 100 L14 200 L46 190 L58 130 Z M196 100 L226 200 L194 190 L182 130 Z"/>`,
        detail: `<rect x="88" y="120" width="66" height="122" rx="4" fill="${VOID}" stroke="${INK}" stroke-width="3"/>
          <ellipse cx="121" cy="170" rx="13" ry="9" fill="#FBF5EA"/><circle cx="121" cy="171" r="4.5" fill="${GOLD}"/><circle cx="121" cy="171" r="1.8" fill="${VOID}"/>
          <path d="M60 140 L72 158 L64 172 L78 196 M176 120 L168 142 L180 160" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="bevel"/>`,
      };
    case 'choir':
      return {
        body: `<path d="M120 84 C170 84 194 130 206 262 L34 262 C46 130 70 84 120 84 Z"/>
          <circle cx="76" cy="84" r="24"/><circle cx="164" cy="84" r="24"/><circle cx="120" cy="56" r="28"/>`,
        detail: `${spiral(68, 80, 7)}${spiral(84, 80, 7)}${spiral(156, 80, 7)}${spiral(172, 80, 7)}${spiral(111, 50, 8)}${spiral(129, 50, 8)}
          <ellipse cx="76" cy="96" rx="6" ry="8" fill="${VOID}"/><ellipse cx="164" cy="96" rx="6" ry="8" fill="${VOID}"/><ellipse cx="120" cy="70" rx="7" ry="10" fill="${VOID}"/>`,
      };
    case 'static':
      return {
        body: `<path d="M120 22 L150 38 L152 78 L172 88 L214 70 L204 110 L188 120 L196 196 L214 264 L166 256 L154 200 L120 208 L86 200 L74 256 L26 264 L44 196 L52 120 L36 110 L26 70 L68 88 L88 78 L90 38 Z"/>
          <path d="M212 96 L226 60 L234 64 L222 112 Z"/>`,
        detail: `<path d="M98 54 L142 54 L142 68 L98 68 Z" fill="${VOID}"/>
          <path d="M102 61 L138 61" stroke="${RED}" stroke-width="3.5" stroke-linecap="round"/>
          ${[96, 128, 150, 178, 214, 236].map((y, i) => `<path d="M${60 + (i % 3) * 22} ${y} h${22 + (i % 2) * 18} M${130 + (i % 2) * 14} ${y + 4} h${16 + (i % 3) * 8}" stroke="${INK}" stroke-width="2.4"/>`).join('')}`,
      };
    case 'warden':
      return {
        body: `<rect x="62" y="6" width="116" height="128" rx="6"/>
          <path d="M120 96 C150 100 166 128 164 158 C182 200 196 236 206 272 L180 258 L162 278 L142 258 L122 280 L102 258 L82 278 L62 258 L34 272 C44 236 58 200 76 158 C74 128 90 100 120 96 Z"/>
          <path d="M84 130 L60 184 L84 176 Z M156 130 L180 184 L156 176 Z"/>`,
        detail: `<path d="M82 28 L158 28 M82 46 L140 46 M82 64 L150 64 M82 82 L128 82 M82 100 L146 100 M82 118 L120 118" stroke="${INK}" stroke-width="2.4" opacity=".75"/>
          ${stare(104, 140, 7, 9)}${stare(136, 140, 7, 9)}
          <path d="M110 170 Q120 178 130 170 L126 184 Q120 188 114 184 Z" fill="${VOID}"/>`,
      };
    case 'moth':
      return {
        body: `<path d="M116 118 C84 58 22 52 18 104 C14 150 64 166 110 142 Z"/>
          <path d="M124 118 C156 58 218 52 222 104 C226 150 176 166 130 142 Z"/>
          <path d="M112 146 C80 170 54 214 76 232 C96 244 114 198 118 162 Z"/>
          <path d="M128 146 C160 170 186 214 164 232 C144 244 126 198 122 162 Z"/>
          <ellipse cx="120" cy="150" rx="13" ry="44"/>`,
        detail: `${[62, 178].map((x) => `<circle cx="${x}" cy="104" r="17" fill="#FBF5EA" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="104" r="10" fill="${GOLD}" stroke="${INK}" stroke-width="1.5"/><circle cx="${x}" cy="104" r="4" fill="${VOID}"/>`).join('')}
          <path d="M112 112 C104 86 92 74 80 70 M128 112 C136 86 148 74 160 70" fill="none" stroke="${INK}" stroke-width="2.5"/>
          <path d="M100 124 L40 96 M100 132 L34 130 M140 124 L200 96 M140 132 L206 130 M112 160 L80 214 M128 160 L160 214" stroke="${INK}" stroke-width="1.4" opacity=".7"/>
          ${stare(114, 122, 4, 5)}${stare(126, 122, 4, 5)}`,
      };
    case 'acolyte':
      return {
        body: `<path d="M120 36 C146 36 160 58 158 86 C176 120 196 196 206 266 L34 266 C44 196 64 120 82 86 C80 58 94 36 120 36 Z"/>
          <path d="M70 150 L52 204 L76 198 Z M170 150 L188 204 L164 198 Z"/>`,
        detail: `<path d="M100 60 C100 50 140 50 140 60 L140 94 C132 106 108 106 100 94 Z" fill="#FBF5EA" stroke="${INK}" stroke-width="2"/>
          <path d="M104 74 Q110 70 116 76 L104 78 Z M124 76 Q130 70 136 74 L136 78 Z" fill="${VOID}"/>
          <path d="M113 92 Q120 96 127 92" fill="none" stroke="${BLOOD}" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="178" y="176" width="10" height="34" fill="#F4ECDC" stroke="${INK}" stroke-width="1.5"/>
          <path d="M183 176 C179 168 183 160 183 156 C187 162 189 168 183 176 Z" fill="${GOLD}"/>
          <circle cx="120" cy="166" r="16" fill="none" stroke="${BLOOD}" stroke-width="2.5"/>
          <path d="M120 150 L120 182 M104 166 L136 166" stroke="${BLOOD}" stroke-width="2"/>`,
      };
    case 'bell':
      return {
        body: `<path d="M120 30 C164 30 180 70 182 118 C184 170 196 212 222 246 L18 246 C44 212 56 170 58 118 C60 70 76 30 120 30 Z"/>
          <rect x="104" y="12" width="32" height="22" rx="6"/>
          <path d="M18 246 L222 246 L226 262 L14 262 Z"/>`,
        detail: `<path d="M86 70 L98 120 L90 160 L100 190" fill="none" stroke="${INK}" stroke-width="2.5"/>
          <ellipse cx="120" cy="190" rx="32" ry="22" fill="${VOID}"/>
          <ellipse cx="120" cy="190" rx="20" ry="14" fill="#FBF5EA"/><ellipse cx="120" cy="190" rx="10" ry="12" fill="${GOLD}"/><ellipse cx="120" cy="190" rx="2.4" ry="10" fill="${VOID}"/>
          <path d="M60 140 C40 150 30 170 28 196 M180 140 C200 150 210 170 212 196" fill="none" stroke="${INK}" stroke-width="3" opacity=".7"/>`,
      };
    case 'keeper':
      return {
        body: `<path d="M120 64 C148 64 160 90 158 120 C176 170 188 220 200 276 L40 276 C52 220 64 170 82 120 C80 90 92 64 120 64 Z"/>
          <path d="M82 124 L30 200 L36 214 L90 160 Z M158 124 L210 200 L204 214 L150 160 Z"/>`,
        detail: `<circle cx="120" cy="70" r="58" fill="none" stroke="${GOLD}" stroke-width="3"/>
          ${Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return `<line x1="${(120 + Math.cos(a) * 50).toFixed(1)}" y1="${(70 + Math.sin(a) * 50).toFixed(1)}" x2="${(120 + Math.cos(a) * 58).toFixed(1)}" y2="${(70 + Math.sin(a) * 58).toFixed(1)}" stroke="${GOLD}" stroke-width="3"/>`;
          }).join('')}
          <path d="M104 86 L136 86 L132 114 L108 114 Z" fill="${VOID}"/>
          ${glint(113, 99, 2.6)}${glint(127, 99, 2.6)}
          <path d="M120 70 L120 22 M120 70 L154 48" stroke="${BLOOD}" stroke-width="5" stroke-linecap="round"/>
          <path d="M100 150 L140 150 M104 170 L136 170 M108 190 L132 190" stroke="${BLOOD}" stroke-width="2.5" opacity=".8"/>`,
      };
  }
}

/** "ゴゴゴ", lettered by hand: the menace that hangs around elites and bosses. */
function menace(): string {
  const go = (x: number, y: number, s: number): string =>
    `<g transform="translate(${x} ${y}) scale(${s}) rotate(-12)"><path d="M0 0 H16 V16 H0" fill="none" stroke="#ECE6D8" stroke-width="7" stroke-linejoin="miter"/><path d="M0 0 H16 V16 H0" fill="none" stroke="${BLOOD}" stroke-width="3.5" stroke-linejoin="miter"/><path d="M18 -8 l3 5 M23 -10 l3 5" stroke="${BLOOD}" stroke-width="2.6" stroke-linecap="round"/></g>`;
  return `<g opacity=".9">${go(196, 30, 1)}${go(206, 62, 0.85)}${go(214, 90, 0.7)}</g>`;
}

/**
 * SVG markup for a Fade family on a 240 x 280 canvas. With a halo, a slow sigil sits behind it;
 * with `menace`, the hand-lettered "gogogo" of a dangerous foe.
 */
export function enemySvg(family: FoeFamily, opts: { halo?: boolean; menace?: boolean } = {}): string {
  const id = `f-${family}`;
  const { body, detail } = draw(family);
  const bare = body.replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '');
  const halo = opts.halo ? `<g transform="translate(20 30) scale(2)" opacity=".55">${sigil(`halo:${family}`, BLOOD, { weight: 0.8 })}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280" fill="none">
  <defs>
    <pattern id="${id}-h" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="4" height="1.1" fill="${INK}"/></pattern>
    <pattern id="${id}-x" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="4" height="1.1" fill="${INK}"/><rect width="1.1" height="4" fill="${INK}"/></pattern>
    <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="0"><stop offset=".48" stop-color="#000"/><stop offset=".72" stop-color="#fff"/></linearGradient>
    <linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#000"/><stop offset=".95" stop-color="#fff"/></linearGradient>
    <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="280"><rect width="240" height="280" fill="url(#${id}-g)"/></mask>
    <mask id="${id}-mb" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="280"><rect width="240" height="280" fill="url(#${id}-b)"/></mask>
    <clipPath id="${id}-c">${bare}</clipPath>
    <filter id="${id}-ink" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d"/>
      <feFlood flood-color="${INK}"/><feComposite in2="d" operator="in" result="o"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d2"/>
      <feOffset in="d2" dx="2.5" dy="-1" result="d3"/>
      <feFlood flood-color="${BLOOD}"/><feComposite in2="d3" operator="in" result="r"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="bl"/>
      <feFlood flood-color="${BLOOD}" flood-opacity=".55"/><feComposite in2="bl" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="r"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${halo}
  ${opts.menace ? menace() : ''}
  <ellipse cx="120" cy="270" rx="84" ry="9" fill="#000" opacity=".55"/>
  <g filter="url(#${id}-ink)">
    <g fill="${PAPER[family]}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">${body}</g>
    <g clip-path="url(#${id}-c)">
      <rect width="240" height="280" fill="url(#${id}-h)" mask="url(#${id}-m)" opacity=".8"/>
      <rect width="240" height="280" fill="url(#${id}-x)" mask="url(#${id}-mb)" opacity=".85"/>
    </g>
    <g fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">${bare}</g>
    ${detail}
  </g>
</svg>`;
}
