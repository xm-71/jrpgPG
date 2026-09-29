import type { FoeFamily } from '@duskline/core';
import { BLOOD, GOLD, INK } from './palette';
import { sigil } from './sigil';

/**
 * Fades are paper-cut silhouettes with static at the edges. Each family has its own outline so the
 * player can read the threat at a glance. Bosses and the Unturning's faithful carry sigils.
 */

const eye = (x: number, y: number, rx = 6, ry = 9): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${GOLD}" stroke="none"/><ellipse cx="${x - 1.5}" cy="${y - 2}" rx="${rx / 3}" ry="${ry / 3}" fill="#fff" opacity=".8" stroke="none"/>`;

function body(family: FoeFamily): string {
  switch (family) {
    case 'wisp':
      return `<path d="M120 24 C150 74 192 104 186 162 C182 216 152 250 120 256 C88 250 58 216 54 162 C48 104 90 74 120 24 Z"/>
        <path d="M60 170 C36 150 30 128 40 106 C52 122 66 130 70 150 Z"/>
        <path d="M180 170 C204 150 210 128 200 106 C188 122 174 130 170 150 Z"/>
        ${eye(98, 156)}${eye(142, 156)}`;
    case 'hound':
      return `<path d="M36 156 L56 124 L84 128 L118 116 L176 120 L212 146 L214 188 L232 254 L204 254 L188 208 L152 208 L142 254 L112 254 L120 208 L84 202 L66 254 L36 254 L52 196 Z"/>
        <path d="M36 156 L14 136 L28 108 L58 112 L72 126 Z"/>
        <path d="M58 112 L52 86 L74 106 Z M78 112 L84 88 L98 116 Z"/>
        <path d="M212 146 L240 116 L234 156 Z"/>
        ${eye(52, 128, 5, 7)}`;
    case 'wraith':
      return `<path d="M120 22 C152 26 172 56 170 94 C188 124 204 192 216 264 L188 246 L170 268 L150 246 L130 270 L112 246 L92 268 L72 246 L50 264 C64 192 80 124 96 94 C90 56 100 26 120 22 Z"/>
        <path d="M100 66 C100 52 140 52 140 66 L140 100 C132 110 108 110 100 100 Z" fill="#000" opacity=".55"/>
        ${eye(108, 84, 5, 8)}${eye(134, 84, 5, 8)}`;
    case 'husk':
      return `<path d="M44 96 L196 96 L214 266 L26 266 Z"/>
        <path d="M44 96 L26 60 L60 84 L82 40 L104 84 L136 36 L158 84 L190 56 L196 96 Z"/>
        <path d="M44 100 L14 200 L46 190 L58 130 Z M196 100 L226 200 L194 190 L182 130 Z"/>
        <rect x="88" y="120" width="66" height="122" rx="4" fill="${INK}" stroke="${BLOOD}" stroke-width="3" stroke-dasharray="6 5"/>
        <rect x="98" y="132" width="46" height="96" rx="3" fill="#000" opacity=".5"/>
        <circle cx="140" cy="182" r="6" fill="${GOLD}"/>
        <path d="M112 114 L112 96 M132 114 L132 96" stroke="${BLOOD}" stroke-width="3"/>`;
    case 'choir':
      return `<path d="M120 84 C170 84 194 130 206 262 L34 262 C46 130 70 84 120 84 Z"/>
        <circle cx="76" cy="84" r="22"/><circle cx="164" cy="84" r="22"/><circle cx="120" cy="58" r="26"/>
        <ellipse cx="76" cy="86" rx="7" ry="9" fill="${GOLD}"/><ellipse cx="164" cy="86" rx="7" ry="9" fill="${GOLD}"/>
        <ellipse cx="120" cy="60" rx="8" ry="11" fill="${GOLD}"/>`;
    case 'static':
      return `<path d="M120 22 L150 38 L152 78 L172 88 L214 70 L204 110 L188 120 L196 196 L214 264 L166 256 L154 200 L120 208 L86 200 L74 256 L26 264 L44 196 L52 120 L36 110 L26 70 L68 88 L88 78 L90 38 Z"/>
        <path d="M100 56 L140 56 L140 66 L100 66 Z" fill="#000" opacity=".6"/>
        <path d="M104 61 L116 61 M124 61 L136 61" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>
        <path d="M212 96 L226 60 L234 64 L222 112 Z"/>
        <path d="M30 96 L14 130 L36 128 Z" opacity=".7"/>`;
    case 'warden':
      return `<rect x="62" y="6" width="116" height="128" rx="6" fill="none" stroke="${BLOOD}" stroke-width="3" stroke-dasharray="8 6"/>
        <path d="M84 30 L156 30 M84 50 L140 50 M84 70 L150 70 M84 90 L128 90" stroke="${BLOOD}" stroke-width="3" opacity=".6"/>
        <path d="M120 96 C150 100 166 128 164 158 C182 200 196 236 206 272 L180 258 L162 278 L142 258 L122 280 L102 258 L82 278 L62 258 L34 272 C44 236 58 200 76 158 C74 128 90 100 120 96 Z"/>
        <path d="M84 130 L60 184 L84 176 Z M156 130 L180 184 L156 176 Z"/>
        ${eye(104, 138, 6, 9)}${eye(136, 138, 6, 9)}<ellipse cx="120" cy="164" rx="9" ry="12" fill="${GOLD}"/>`;
    case 'moth':
      return `<path d="M116 118 C84 58 22 52 18 104 C14 150 64 166 110 142 Z"/>
        <path d="M124 118 C156 58 218 52 222 104 C226 150 176 166 130 142 Z"/>
        <path d="M112 146 C80 170 54 214 76 232 C96 244 114 198 118 162 Z"/>
        <path d="M128 146 C160 170 186 214 164 232 C144 244 126 198 122 162 Z"/>
        <ellipse cx="120" cy="150" rx="12" ry="42"/>
        <path d="M112 112 C104 86 92 74 80 70 M128 112 C136 86 148 74 160 70" fill="none" stroke-width="3"/>
        <circle cx="62" cy="104" r="14" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="none"/>
        <circle cx="178" cy="104" r="14" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="none"/>
        ${eye(114, 124, 4, 5)}${eye(126, 124, 4, 5)}`;
    case 'acolyte':
      return `<path d="M120 36 C146 36 160 58 158 86 C176 120 196 196 206 266 L34 266 C44 196 64 120 82 86 C80 58 94 36 120 36 Z"/>
        <path d="M100 66 C100 56 140 56 140 66 L140 96 C132 106 108 106 100 96 Z" fill="#D9D2C2" stroke="none"/>
        <path d="M106 78 L116 80 M124 80 L134 78" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <path d="M112 92 L128 92" stroke="${BLOOD}" stroke-width="3" stroke-linecap="round"/>
        <path d="M70 150 L52 204 L76 198 Z M170 150 L188 204 L164 198 Z"/>
        <rect x="178" y="176" width="10" height="34" fill="#E9E0CC" stroke="none"/>
        <path d="M183 176 C179 168 183 160 183 156 C187 162 189 168 183 176 Z" fill="${GOLD}" stroke="none"/>
        <circle cx="120" cy="166" r="16" fill="none" stroke="${BLOOD}" stroke-width="2.5" stroke-dasharray="none"/>
        <path d="M120 150 L120 182 M104 166 L136 166" stroke="${BLOOD}" stroke-width="2"/>`;
    case 'bell':
      return `<path d="M120 30 C164 30 180 70 182 118 C184 170 196 212 222 246 L18 246 C44 212 56 170 58 118 C60 70 76 30 120 30 Z"/>
        <rect x="104" y="12" width="32" height="22" rx="6"/>
        <path d="M18 246 L222 246 L226 262 L14 262 Z"/>
        <path d="M86 70 L98 120 L90 160" fill="none" stroke="${BLOOD}" stroke-width="3" stroke-dasharray="none"/>
        <ellipse cx="120" cy="190" rx="30" ry="22" fill="#000" opacity=".6"/>
        ${eye(120, 190, 16, 18)}
        <path d="M60 140 C40 150 30 170 28 196 M180 140 C200 150 210 170 212 196" fill="none" stroke-width="3" opacity=".7"/>`;
    case 'keeper':
      return `<circle cx="120" cy="70" r="58" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="none"/>
        ${Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 120 + Math.cos(a) * 50;
          const y1 = 70 + Math.sin(a) * 50;
          const x2 = 120 + Math.cos(a) * 58;
          const y2 = 70 + Math.sin(a) * 58;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${GOLD}" stroke-width="3" stroke-dasharray="none"/>`;
        }).join('')}
        <path d="M120 70 L120 22 M120 70 L154 48" stroke="${BLOOD}" stroke-width="5" stroke-linecap="round" stroke-dasharray="none"/>
        <path d="M120 64 C148 64 160 90 158 120 C176 170 188 220 200 276 L40 276 C52 220 64 170 82 120 C80 90 92 64 120 64 Z"/>
        <path d="M82 124 L30 200 L36 214 L90 160 Z M158 124 L210 200 L204 214 L150 160 Z"/>
        <path d="M104 88 L136 88 L132 112 L108 112 Z" fill="#000" opacity=".6"/>
        ${eye(112, 98, 4, 6)}${eye(128, 98, 4, 6)}
        <path d="M100 150 L140 150 M104 170 L136 170 M108 190 L132 190" stroke="${BLOOD}" stroke-width="2.5" opacity=".7"/>`;
  }
}

/**
 * SVG markup for a Fade family on a 240 x 280 canvas. The body is cut from dark paper, lit from behind by
 * the stuck sun: a vermilion rim, a red bloom around the edge and faint static across the face.
 * With a halo, a slow sigil sits behind it.
 */
export function enemySvg(family: FoeFamily, opts: { halo?: boolean } = {}): string {
  const halo = opts.halo ? `<g transform="translate(20 30) scale(2)" opacity=".55">${sigil(`halo:${family}`, BLOOD, { weight: 0.8 })}</g>` : '';
  const shape = body(family);
  const bare = shape.replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280" fill="none">
  <defs>
    <pattern id="scan-${family}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1.4" fill="#fff" opacity=".06"/></pattern>
    <linearGradient id="paper-${family}" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0" stop-color="#3a2a3c"/>
      <stop offset=".45" stop-color="#17121e"/>
      <stop offset="1" stop-color="#060509"/>
    </linearGradient>
    <linearGradient id="rim-${family}" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8a6a"/>
      <stop offset=".5" stop-color="${BLOOD}"/>
      <stop offset="1" stop-color="#5a1412"/>
    </linearGradient>
    <filter id="bloom-${family}" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>
      <feFlood flood-color="${BLOOD}" flood-opacity=".8"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${halo}
  <ellipse cx="120" cy="272" rx="84" ry="9" fill="#000" opacity=".55"/>
  <g filter="url(#bloom-${family})">
    <g fill="url(#paper-${family})" stroke="url(#rim-${family})" stroke-width="2.4" stroke-linejoin="round">
      ${shape}
    </g>
  </g>
  <g fill="url(#scan-${family})">${bare}</g>
</svg>`;
}
