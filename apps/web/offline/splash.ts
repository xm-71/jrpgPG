import { iconMarkup } from './icon.ts';

/**
 * A launch image: the game's own night, and the app icon floating in it. It is drawn at whatever pixel
 * size a screen needs, and has no lettering, so it needs no fonts. Colours match theme.css, so the
 * first screen of the game arrives on the same dark it left.
 */

const INK = '#07060B';
const BONE = '#ECE6D8';
/** The rounded corner iOS gives an app icon, as a share of its side. */
const CORNER = 0.2237;

export function splashSvg(width: number, height: number): string {
  const side = Math.round(Math.min(width, height) * 0.3);
  const x = Math.round((width - side) / 2);
  const y = Math.round(height * 0.46 - side / 2);
  const radius = side * CORNER;
  const cx = x + side / 2;
  const cy = y + side / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <radialGradient id="top"><stop offset="0" stop-color="#17111F"/><stop offset=".6" stop-color="${INK}"/></radialGradient>
  <radialGradient id="low"><stop offset="0" stop-color="#C8322C" stop-opacity=".22"/><stop offset=".7" stop-color="#C8322C" stop-opacity="0"/></radialGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#E25A45" stop-opacity=".3"/><stop offset="1" stop-color="#E25A45" stop-opacity="0"/></radialGradient>
  <clipPath id="squircle"><rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${radius.toFixed(1)}"/></clipPath>
</defs>
<rect width="${width}" height="${height}" fill="${INK}"/>
<rect x="${-0.7 * width}" y="${-height}" width="${2.4 * width}" height="${1.8 * height}" fill="url(#top)"/>
<rect x="${-0.4 * width}" y="${0.55 * height}" width="${1.8 * width}" height="${1.2 * height}" fill="url(#low)"/>
<circle cx="${cx}" cy="${cy}" r="${(side * 1.05).toFixed(0)}" fill="url(#halo)"/>
<g clip-path="url(#squircle)"><svg x="${x}" y="${y}" width="${side}" height="${side}" viewBox="0 0 512 512">${iconMarkup()}</svg></g>
<rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${radius.toFixed(1)}" fill="none" stroke="${BONE}" stroke-opacity=".16" stroke-width="${Math.max(2, Math.round(side / 150))}"/>
</svg>`;
}
