/**
 * Small geometry for drawing in SVG: points, smooth curves through points, and filled "brush"
 * strokes whose width swells and tapers the way a manga G-pen line does.
 */

export type P = readonly [number, number];

/** One decimal place is plenty for art at these sizes and keeps the markup small. */
export const r1 = (n: number): string => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};
export const pt = (p: P): string => `${r1(p[0])} ${r1(p[1])}`;

export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
export const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const len = (a: P): number => Math.hypot(a[0], a[1]);
export const dist = (a: P, b: P): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const unit = (a: P): P => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** The left-hand normal of a direction (y down). */
export const perp = (a: P): P => [-a[1], a[0]];
export const polar = (c: P, r: number, ang: number): P => [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r];
/** Reflect across the vertical line x = cx. */
export const flipX = (p: P, cx = 0): P => [2 * cx - p[0], p[1]];
export const deg = (d: number): number => (d * Math.PI) / 180;

/** Catmull-Rom spline through the points, written as cubic Bézier commands. */
export function smooth(points: readonly P[], closed = true, tension = 1): string {
  const n = points.length;
  if (n < 2) return '';
  const at = (i: number): P => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  let d = `M${pt(points[0]!)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

/** Straight segments through the points, closed. */
export const poly = (points: readonly P[]): string => `M${points.map(pt).join('L')}Z`;

/** A dense polyline along the Catmull-Rom curve through the points. */
export function sample(points: readonly P[], per = 6): P[] {
  const n = points.length;
  if (n < 2) return [...points];
  const at = (i: number): P => points[Math.max(0, Math.min(n - 1, i))]!;
  const out: P[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (k: 0 | 1): number => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  out.push(points[n - 1]!);
  return out;
}

export interface BrushOptions {
  /** Fraction of the stroke over which it swells in from a point. 0 starts blunt. */
  in?: number;
  /** Fraction over which it tapers out to a point. 0 ends blunt. */
  out?: number;
  /** Thinnest width, as a fraction of the full width. */
  min?: number;
}

/**
 * A filled ink stroke along a curve through `points`: `w` wide at its heaviest, swelling in and
 * lifting out to a point. This is the basic mark of the whole figure: lids, brows, hair strands,
 * folds and outlines that need weight.
 */
export function brush(points: readonly P[], w: number, o: BrushOptions = {}): string {
  const line = sample(points, points.length > 3 ? 4 : 6);
  const n = line.length;
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1]! + dist(line[i - 1]!, line[i]!));
  const total = acc[n - 1] || 1;
  const tin = o.in ?? 0.3;
  const tout = o.out ?? 0.35;
  const min = o.min ?? 0.12;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < n; i++) {
    const t = acc[i]! / total;
    let k = 1;
    if (tin > 0 && t < tin) k = Math.min(k, t / tin);
    if (tout > 0 && t > 1 - tout) k = Math.min(k, (1 - t) / tout);
    const half = (w * Math.max(min, Math.sin((k * Math.PI) / 2))) / 2;
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(n - 1, i + 1)]!;
    const nrm = unit(perp(sub(b, a)));
    left.push(add(line[i]!, mul(nrm, half)));
    right.push(sub(line[i]!, mul(nrm, half)));
  }
  right.reverse();
  return `M${left.map(pt).join('L')}L${right.map(pt).join('L')}Z`;
}

/**
 * A tube along the points with a width at each point: arms, legs, sleeves, tails of cloth.
 * Ends are rounded. Returned as a smooth closed path.
 */
export function tube(points: readonly P[], widths: readonly number[], roundEnds = true): string {
  const n = points.length;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    const nrm = unit(perp(sub(b, a)));
    const half = (widths[i] ?? widths[widths.length - 1]!) / 2;
    left.push(add(points[i]!, mul(nrm, half)));
    right.push(sub(points[i]!, mul(nrm, half)));
  }
  const outline: P[] = [...left];
  if (roundEnds) {
    const d = unit(sub(points[n - 1]!, points[n - 2]!));
    outline.push(add(points[n - 1]!, mul(d, (widths[n - 1] ?? 0) * 0.42)));
  }
  outline.push(...[...right].reverse());
  if (roundEnds) {
    const d = unit(sub(points[0]!, points[1]!));
    outline.push(add(points[0]!, mul(d, (widths[0] ?? 0) * 0.3)));
  }
  return smooth(outline, true, 0.9);
}

/** A pointed clump: from a base of width `w` (centred on `root`) to `tip`, sides bowed by `bow`. */
export function spike(root: P, tip: P, w: number, bow = 0.15): string {
  const dir = sub(tip, root);
  const nrm = unit(perp(dir));
  const a = add(root, mul(nrm, w / 2));
  const b = sub(root, mul(nrm, w / 2));
  const mid = lerp(root, tip, 0.5);
  const ca = add(mid, mul(nrm, w * (0.5 + bow)));
  const cb = sub(mid, mul(nrm, w * (0.5 - bow)));
  return `M${pt(a)}Q${pt(ca)} ${pt(tip)}Q${pt(cb)} ${pt(b)}Z`;
}

/** A four-pointed sparkle centred on c. */
export function sparkle(c: P, r: number, thin = 0.18): string {
  const [x, y] = c;
  const t = r * thin;
  return `M${r1(x)} ${r1(y - r)}Q${r1(x + t)} ${r1(y - t)} ${r1(x + r)} ${r1(y)}Q${r1(x + t)} ${r1(y + t)} ${r1(x)} ${r1(y + r)}Q${r1(x - t)} ${r1(y + t)} ${r1(x - r)} ${r1(y)}Q${r1(x - t)} ${r1(y - t)} ${r1(x)} ${r1(y - r)}Z`;
}

export const ellipse = (c: P, rx: number, ry: number): string =>
  `M${r1(c[0] - rx)} ${r1(c[1])}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(c[0] + rx)} ${r1(c[1])}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(c[0] - rx)} ${r1(c[1])}Z`;

/** A small seeded generator, so the same hero always draws the same strands. */
export function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
