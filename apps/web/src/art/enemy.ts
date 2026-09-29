import type { FoeFamily } from '@duskline/core';

/**
 * Fades are paper-cut silhouettes with static at the edges. Each family has its own outline so the
 * player can read the threat at a glance: a flame, a hound, a hooded robe, a door in a coat pile,
 * a bell of singers, an armoured knight, a robed keeper with a page for a halo.
 */

const VOID = '#0B0918';
const ROSE = '#E0457B';
const GOLD = '#F2B43A';

const eye = (x: number, y: number, rx = 6, ry = 9): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${GOLD}"/><ellipse cx="${x - 1.5}" cy="${y - 2}" rx="${rx / 3}" ry="${ry / 3}" fill="#fff" opacity=".8"/>`;

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
        <rect x="88" y="120" width="66" height="122" rx="4" fill="${VOID}" stroke="${ROSE}" stroke-width="3" stroke-dasharray="6 5"/>
        <rect x="98" y="132" width="46" height="96" rx="3" fill="#000" opacity=".5"/>
        <circle cx="140" cy="182" r="6" fill="${GOLD}"/>
        <path d="M112 114 L112 96 M132 114 L132 96" stroke="${ROSE}" stroke-width="3"/>`;
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
      return `<rect x="62" y="6" width="116" height="128" rx="6" fill="none" stroke="${ROSE}" stroke-width="3" stroke-dasharray="8 6"/>
        <path d="M84 30 L156 30 M84 50 L140 50 M84 70 L150 70 M84 90 L128 90" stroke="${ROSE}" stroke-width="3" opacity=".6"/>
        <path d="M120 96 C150 100 166 128 164 158 C182 200 196 236 206 272 L180 258 L162 278 L142 258 L122 280 L102 258 L82 278 L62 258 L34 272 C44 236 58 200 76 158 C74 128 90 100 120 96 Z"/>
        <path d="M84 130 L60 184 L84 176 Z M156 130 L180 184 L156 176 Z"/>
        ${eye(104, 138, 6, 9)}${eye(136, 138, 6, 9)}<ellipse cx="120" cy="164" rx="9" ry="12" fill="${GOLD}"/>`;
  }
}

/** SVG markup for an enemy family on a 240 x 280 canvas. */
export function enemySvg(family: FoeFamily): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280" fill="none">
  <defs>
    <pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1.4" fill="#fff" opacity=".08"/></pattern>
  </defs>
  <ellipse cx="120" cy="272" rx="80" ry="8" fill="#000" opacity=".35"/>
  <g fill="${VOID}" stroke="${ROSE}" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round">
    ${body(family)}
  </g>
  <g fill="url(#scan)" opacity=".9">${body(family).replace(/fill="[^"]*"/g, '').replace(/stroke="[^"]*"/g, '')}</g>
</svg>`;
}
