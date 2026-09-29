import { BLOOD, BONE, ROMAN, artRng } from './palette';

/**
 * Occult geometry, drawn from a seed: rings, a sundial's twelve ticks, a star polygon and a
 * gnomon line. Every card, foe halo and Echo has one, and the same seed always draws the same seal.
 * Returns SVG elements centred on (50, 50) in a 100 x 100 box.
 */
export function sigil(seed: string, color: string, opts: { hour?: number; numerals?: boolean; weight?: number } = {}): string {
  const r = artRng(seed);
  const w = opts.weight ?? 1;
  const parts: string[] = [];
  const rings = 1 + Math.floor(r() * 3);
  const radii = [46, 38, 31].slice(0, rings);
  radii.forEach((rad, i) => {
    const dash = i === 1 && r() < 0.6 ? ` stroke-dasharray="${(2 + r() * 4).toFixed(1)} ${(2 + r() * 3).toFixed(1)}"` : '';
    parts.push(`<circle cx="50" cy="50" r="${rad}" stroke="${color}" stroke-width="${(i === 0 ? 1.2 : 0.8) * w}"${dash}/>`);
  });
  // The sundial: twelve ticks, one of them marked.
  const hour = opts.hour ?? 1 + Math.floor(r() * 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const marked = i + 1 === hour;
    const r1 = marked ? 36 : 42;
    const x1 = 50 + Math.cos(a) * r1;
    const y1 = 50 + Math.sin(a) * r1;
    const x2 = 50 + Math.cos(a) * 46;
    const y2 = 50 + Math.sin(a) * 46;
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${marked ? BLOOD : color}" stroke-width="${(marked ? 2.4 : 1) * w}"/>`);
    if (opts.numerals && (i % 3 === 0 || marked)) {
      const tx = 50 + Math.cos(a) * 30;
      const ty = 50 + Math.sin(a) * 30 + 2.2;
      parts.push(`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="6" text-anchor="middle" fill="${marked ? BLOOD : color}" font-family="serif">${ROMAN[i]}</text>`);
    }
  }
  // A star polygon.
  const n = [3, 4, 5, 6, 7, 8][Math.floor(r() * 6)]!;
  const step = n >= 5 && r() < 0.7 ? (n === 6 ? 1 : 2) : 1;
  const rot = r() * Math.PI * 2;
  const pr = 22 + r() * 8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) pts.push([50 + Math.cos(rot + (i / n) * Math.PI * 2) * pr, 50 + Math.sin(rot + (i / n) * Math.PI * 2) * pr]);
  let d = '';
  const seen = new Set<number>();
  for (let start = 0; start < n; start++) {
    if (seen.has(start)) continue;
    let i = start;
    d += `M${pts[i]![0].toFixed(1)} ${pts[i]![1].toFixed(1)}`;
    do {
      seen.add(i);
      i = (i + step) % n;
      d += ` L${pts[i]![0].toFixed(1)} ${pts[i]![1].toFixed(1)}`;
    } while (i !== start);
  }
  parts.push(`<path d="${d}" stroke="${color}" stroke-width="${0.9 * w}" stroke-linejoin="round"/>`);
  for (const [x, y] of pts) parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.4 * w).toFixed(1)}" fill="${color}"/>`);
  // The gnomon: a line from the centre toward the marked hour.
  const ga = ((hour - 1) / 12) * Math.PI * 2 - Math.PI / 2;
  parts.push(`<line x1="50" y1="50" x2="${(50 + Math.cos(ga) * 34).toFixed(1)}" y2="${(50 + Math.sin(ga) * 34).toFixed(1)}" stroke="${BLOOD}" stroke-width="${1.6 * w}" stroke-linecap="round"/>`);
  // A centre mark: an eye, a crescent or a point.
  const c = r();
  if (c < 0.34) parts.push(`<path d="M40 50 Q50 42 60 50 Q50 58 40 50 Z" stroke="${color}" stroke-width="${w}"/><circle cx="50" cy="50" r="2.6" fill="${BONE}"/>`);
  else if (c < 0.67) parts.push(`<path d="M53 42 A8 8 0 1 0 53 58 A6 6 0 1 1 53 42 Z" fill="${color}"/>`);
  else parts.push(`<circle cx="50" cy="50" r="3.2" fill="${color}"/>`);
  return `<g fill="none">${parts.join('')}</g>`;
}

export function sigilSvg(seed: string, color: string, size = 100, opts: { hour?: number; numerals?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${sigil(seed, color, opts)}</svg>`;
}
