/**
 * The app icon: the Gnomon pinning the stuck sun, over a sundial ring, drawn as one SVG. The build
 * renders it to PNG at each size the manifest and iOS need, so there is no binary art to keep in step.
 * Colours match theme.css.
 */

const INK = '#07060B';
const BLOOD = '#C8322C';
const BONE = '#ECE6D8';
const GOLD = '#D9A441';

function art(): string {
  const cx = 256;
  const horizon = 352;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const long = i % 3 === 0;
    const r0 = long ? 176 : 188;
    const r1 = 202;
    const f = (n: number): string => n.toFixed(1);
    return `<path d="M${f(cx + Math.cos(a) * r0)} ${f(horizon + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r1)} ${f(horizon + Math.sin(a) * r1)}" stroke-width="${long ? 5 : 3}"/>`;
  }).join('');
  const sea = [0, 1, 2, 3, 4]
    .map((i) => {
      const y = horizon + 14 + i * 17 + i * i * 2;
      const half = 78 - i * 12;
      return `<path d="M${346 - half} ${y}L${346 + half} ${y}" stroke="#F0A060" stroke-width="${3 + i}" stroke-linecap="round" opacity="${(0.55 - i * 0.09).toFixed(2)}"/>`;
    })
    .join('');
  // The sky, sea and horizon run far past the square so a scaled copy still bleeds to the edge.
  return `<rect x="-512" y="-512" width="1536" height="1536" fill="url(#sky)"/>
  <g fill="none" stroke="${BONE}" opacity=".3"><circle cx="${cx}" cy="${horizon}" r="202" stroke-width="3"/><circle cx="${cx}" cy="${horizon}" r="160" stroke-width="2" stroke-dasharray="3 12"/>${ticks}</g>
  <circle cx="346" cy="${horizon - 16}" r="150" fill="url(#glow)"/>
  <circle cx="346" cy="${horizon - 16}" r="68" fill="url(#sun)"/>
  <rect x="-512" y="${horizon}" width="1536" height="1024" fill="url(#sea)"/>
  <path d="M-512 ${horizon}H1024" stroke="#E25A45" stroke-width="3" opacity=".7"/>
  ${sea}
  <path d="M124 ${horizon} L172 78 L186 50 L216 ${horizon} Z" fill="#050408"/>
  <path d="M186 50 L216 ${horizon}" stroke="${BLOOD}" stroke-width="7" stroke-linecap="round"/>
  <path d="M154 250H184M148 292H192" stroke="${BLOOD}" stroke-width="3" opacity=".45"/>
  <circle cx="181" cy="150" r="7" fill="${GOLD}"/>`;
}

const DEFS = `<defs>
  <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="512">
    <stop offset="0" stop-color="${INK}"/><stop offset=".5" stop-color="#170F1E"/><stop offset=".68" stop-color="#5C1A1C"/><stop offset="1" stop-color="#160C12"/>
  </linearGradient>
  <linearGradient id="sea" gradientUnits="userSpaceOnUse" x1="0" y1="352" x2="0" y2="512"><stop offset="0" stop-color="#150A10"/><stop offset="1" stop-color="#08060C"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#E25A45" stop-opacity=".55"/><stop offset="1" stop-color="#E25A45" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun"><stop offset="0" stop-color="#FFF1D0"/><stop offset=".45" stop-color="#F0B060"/><stop offset="1" stop-color="${BLOOD}"/></radialGradient>
</defs>`;

/** The icon's drawing and its gradients, for a page that places it inside a larger picture (the launch images). */
export function iconMarkup(): string {
  return `${DEFS}${art()}`;
}

/** The icon at full bleed: the square the manifest and the favicon use. */
export function iconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${iconMarkup()}</svg>`;
}

/**
 * The icon for Android's adaptive shapes: the picture is drawn at 70% so a circle, squircle or
 * teardrop mask never cuts into the tower, with the sky filling the whole square behind it.
 */
export function maskableIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${DEFS}<g transform="translate(256 256) scale(.7) translate(-256 -256)">${art()}</g></svg>`;
}
