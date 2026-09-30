// Shared drawing kit for the seven look samples. Builds on the game's own geometry (apps/web/src/art/manga/geom.ts).
export * from '../../apps/web/src/art/manga/geom.ts';
import { brush, smooth, pt, r1, type P, type BrushOptions } from '../../apps/web/src/art/manga/geom.ts';

export const W = 800;
export const H = 1000;

/** A filled shape. */
export const fill = (d: string, color: string, extra = ''): string => `<path d="${d}" fill="${color}"${extra ? ' ' + extra : ''}/>`;
/** A shape with a uniform outline (anime cel line). */
export const shape = (d: string, color: string, line: string, w: number, extra = ''): string =>
  `<path d="${d}" fill="${color}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`;
/** A plain stroke. */
export const line = (d: string, color: string, w: number, extra = ''): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`;
/** A tapered ink stroke through points. */
export const ink = (pts: readonly P[], w: number, color: string, o: BrushOptions = {}, extra = ''): string => fill(brush(pts, w, o), color, extra);
/** Smooth closed blob through points. */
export const blob = (pts: readonly P[], tension = 1): string => smooth(pts, true, tension);
/** Smooth open curve. */
export const curve = (pts: readonly P[], tension = 1): string => smooth(pts, false, tension);
/** Polygon. */
export const polyD = (pts: readonly P[]): string => `M${pts.map(pt).join('L')}Z`;

/** Clip content to a shape. */
let clipN = 0;
export function clipped(d: string, content: string): string {
  const id = `c${clipN++}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${content}</g>`;
}
let gradN = 0;
export function linear(stops: Array<[number, string, number?]>, x1 = 0, y1 = 0, x2 = 0, y2 = 1): { id: string; def: string } {
  const id = `g${gradN++}`;
  const s = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('');
  return { id, def: `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>` };
}
export function radial(stops: Array<[number, string, number?]>, cx = 0.5, cy = 0.5, r = 0.5): { id: string; def: string } {
  const id = `g${gradN++}`;
  const s = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('');
  return { id, def: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>` };
}
let filtN = 0;
export function blurFilter(sd: number): { id: string; def: string } {
  const id = `f${filtN++}`;
  return { id, def: `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>` };
}
/** Soft glow around content (blurred copy under it). */
export function glowFilter(sd: number, strength = 1.6): { id: string; def: string } {
  const id = `f${filtN++}`;
  return {
    id,
    def: `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="${sd}" result="b"/><feComponentTransfer in="b" result="b2"><feFuncA type="linear" slope="${strength}"/></feComponentTransfer><feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  };
}
/** Rough, wobbling edge (for cursed energy, smoke, brush texture). */
export function roughFilter(scale: number, freq = 0.03, seed = 3): { id: string; def: string } {
  const id = `f${filtN++}`;
  return {
    id,
    def: `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`,
  };
}
/** Paper/grain texture overlay. */
export function grainFilter(opacity = 0.08, freq = 0.9): { id: string; def: string } {
  const id = `f${filtN++}`;
  return {
    id,
    def: `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${opacity * 4} -${opacity}"/></filter>`,
  };
}
/** Halftone dot pattern. */
let patN = 0;
export function dots(color: string, cell: number, r: number, angle = 45): { id: string; def: string } {
  const id = `p${patN++}`;
  return { id, def: `<pattern id="${id}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${cell / 2}" cy="${cell / 2}" r="${r}" fill="${color}"/></pattern>` };
}
export function hatchPattern(color: string, gap: number, w: number, angle = -40): { id: string; def: string } {
  const id = `p${patN++}`;
  return { id, def: `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${gap}" height="${w}" fill="${color}"/></pattern>` };
}

/** Radial speed/focus lines around a centre, leaving a clear middle. */
export function focusLines(c: P, inner: number, outer: number, count: number, color: string, seed = 1, wMax = 10): string {
  let s = seed;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd() * 0.05;
    const r0 = inner + rnd() * (outer - inner) * 0.35;
    const w = 1 + rnd() * wMax;
    const p0: P = [c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0];
    const p1: P = [c[0] + Math.cos(a) * outer, c[1] + Math.sin(a) * outer];
    const nx = -Math.sin(a) * w / 2;
    const ny = Math.cos(a) * w / 2;
    out += `M${pt(p0)}L${r1(p1[0] + nx)} ${r1(p1[1] + ny)}L${r1(p1[0] - nx)} ${r1(p1[1] - ny)}Z`;
  }
  return `<path d="${out}" fill="${color}"/>`;
}

export function svg(w: number, h: number, defs: string[], body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${body}</svg>`;
}

export function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Mirror helper: offset points. */
export const shift = (pts: readonly P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy] as P);
export const scaleAbout = (pts: readonly P[], c: P, k: number, ky = k): P[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * ky] as P);
export { r1, pt };
export type { P };
