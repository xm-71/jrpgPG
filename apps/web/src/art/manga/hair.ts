import type { Look } from '@duskline/core';
import { lightness, mix, shade } from '../color';
import { type P, add, brush, ellipse, lerp, polar, pt, r1, rng, smooth, spike, tube } from './geom';
import { INK, type Sheet } from './ink';
import type { StyleSpec } from './styles';

/**
 * Hair: the part of a manga design that carries a character's identity, so every hero's
 * silhouette starts here. Drawn in head-local coordinates (skull top at 0, chin at u).
 * `back` goes behind the head and body, `front` over the face, and `fringe` is the outline of the
 * bangs, used to cast a shadow on the forehead.
 */

export interface HairOut {
  back: string;
  front: string;
  fringe: string;
}

interface Ctx {
  s: Sheet;
  spec: StyleSpec;
  look: Look;
  u: number;
  hw: number;
  base: string;
  dark: string;
  light: string;
  line: number;
  rand: () => number;
}

/** Dark hair shines blue-violet (tsuya-beta); light hair shines toward white. */
function hairLight(base: string): string {
  return lightness(base) < 0.25 ? mix(base, '#9FB0F0', 0.42) : shade(base, 0.5);
}

function fillHair(c: Ctx, d: string, off = 0.05): string {
  return c.s.shaded(d, c.base, { off: off * c.u, line: c.line });
}

/** Fine strands inside a lock, from root toward tip. */
function strand(c: Ctx, pts: P[], w = 0.012, opacity = 0.75): string {
  return c.s.ink(brush(pts, w * c.u * c.spec.line, { in: 0.15, out: 0.6, min: 0.15 }), INK, opacity);
}

/** The angel ring: a jagged band of shine across the crown, clipped to the hair. */
function shine(c: Ctx, clipD: string, y: number, spread: number, width = 0.07): string {
  const { u, hw } = c;
  const clip = c.s.uid('r');
  const top: P[] = [];
  const bottom: P[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = -hw * spread + ((2 * hw * spread) / n) * i;
    const curve = Math.pow(x / (hw * 1.2), 2) * 0.12 * u;
    top.push([x, y * u + curve - (i % 2 ? 0.02 : 0) * u]);
    bottom.push([x, y * u + curve + width * u + (i % 2 ? 0.03 : -0.01) * u]);
  }
  const d = `M${top.map(pt).join('L')}L${bottom.reverse().map(pt).join('L')}Z`;
  return `<clipPath id="${clip}"><path d="${clipD}"/></clipPath><g clip-path="url(#${clip})"><path d="${d}" fill="${c.light}" opacity=".9"/></g>`;
}

/** A crown of pointed clumps around a centre, as one outline. */
function crown(center: P, spikes: Array<{ a: number; r: number; w: number }>, r0: number): string {
  let d = '';
  spikes.forEach((sp, i) => {
    const a0 = polar(center, r0, sp.a - sp.w / 2);
    const tip = polar(center, r0 + sp.r, sp.a);
    const a1 = polar(center, r0, sp.a + sp.w / 2);
    const c0 = polar(center, r0 + sp.r * 0.55, sp.a - sp.w * 0.28);
    const c1 = polar(center, r0 + sp.r * 0.5, sp.a + sp.w * 0.22);
    d += `${i === 0 ? 'M' : 'L'}${pt(a0)}Q${pt(c0)} ${pt(tip)}Q${pt(c1)} ${pt(a1)}`;
  });
  return `${d}Z`;
}

function cap(c: Ctx, top = -0.1, hair = 0.22, temple = 0.5, wide = 1.08): string {
  const { u, hw } = c;
  return smooth(
    [
      [-hw * 1.02, temple * u],
      [-hw * wide, 0.22 * u],
      [-hw * 0.72, (top + 0.04) * u],
      [0, top * u],
      [hw * 0.72, (top + 0.04) * u],
      [hw * wide, 0.22 * u],
      [hw * 1.02, temple * u],
      [hw * 0.8, 0.3 * u],
      [0, hair * u],
      [-hw * 0.8, 0.3 * u],
    ],
    true,
  );
}

// ---------------------------------------------------------------------------
// The twelve styles
// ---------------------------------------------------------------------------

function spiky(c: Ctx): HairOut {
  const { u, hw, rand } = c;
  const center: P = [0, 0.36 * u];
  const angles = [-190, -166, -142, -117, -93, -69, -45, -21, 3];
  const spikes = angles.map((a, i) => ({ a: (a * Math.PI) / 180 + (rand() - 0.5) * 0.08, r: u * (0.2 + 0.24 * Math.sin((i / 8) * Math.PI) + rand() * 0.08), w: 0.5 }));
  const mass = crown(center, spikes, 0.44 * u);
  let back = '';
  for (const side of [1, -1]) back += fillHair(c, spike([side * hw * 0.8, 0.5 * u], [side * hw * 1.45, 0.82 * u], 0.3 * u, 0.1 * side));
  let front = fillHair(c, mass, 0.07);
  front += shine(c, mass, 0.02, 1.1, 0.06);
  spikes.forEach((sp) => {
    const root = polar(center, 0.5 * u, sp.a);
    front += strand(c, [root, polar(center, 0.46 * u + sp.r * 0.8, sp.a + 0.05)], 0.012);
  });
  // Bangs: a few clumps of different lengths, swept a little to one side so the eyes show.
  const bangs: Array<[P, P, number, number]> = [
    [[-hw * 0.88, 0.16 * u], [-hw * 1.0, 0.62 * u], 0.3, -0.2],
    [[-hw * 0.5, 0.1 * u], [-hw * 0.66, 0.47 * u], 0.34, -0.15],
    [[-hw * 0.08, 0.08 * u], [hw * 0.02, 0.44 * u], 0.36, 0.12],
    [[hw * 0.4, 0.1 * u], [hw * 0.58, 0.4 * u], 0.3, 0.2],
    [[hw * 0.86, 0.16 * u], [hw * 1.0, 0.58 * u], 0.28, 0.25],
  ];
  let fringe = '';
  for (const [root, tip, w, bow] of bangs) {
    const d = spike(root, tip, w * hw, bow);
    fringe += d;
    front += fillHair(c, d, 0.03);
    front += strand(c, [lerp(root, tip, 0.15), lerp(root, tip, 0.75)], 0.009, 0.55);
  }
  // The ahoge: one stubborn strand that will not lie down.
  front += c.s.ink(brush([[0.02 * u, -0.08 * u], [0.1 * u, -0.28 * u], [0.22 * u, -0.34 * u], [0.2 * u, -0.26 * u]], 0.05 * u, { in: 0.1, out: 0.7 }), c.base);
  front += c.s.ink(brush([[0.02 * u, -0.08 * u], [0.1 * u, -0.28 * u], [0.22 * u, -0.34 * u], [0.2 * u, -0.26 * u]], 0.012 * u, { in: 0.2, out: 0.5 }));
  return { back, front, fringe };
}

function hime(c: Ctx): HairOut {
  const { u, hw } = c;
  const curtain: P[] = [[0, -0.08 * u], [hw * 1.1, 0.2 * u], [hw * 1.28, 1.4 * u], [hw * 1.42, 3.3 * u], [-hw * 1.42, 3.3 * u], [-hw * 1.28, 1.4 * u], [-hw * 1.1, 0.2 * u]];
  let backD = smooth(curtain.slice(0, 4), false).replace(/Z$/, '');
  // A blunt, slightly ragged cut across the bottom.
  for (let i = 1; i <= 8; i++) backD += `L${r1(hw * 1.42 - (hw * 2.84 * i) / 8)} ${r1(3.3 * u + (i % 2 ? 0.06 : 0) * u)}`;
  backD += smooth(curtain.slice(4).concat([curtain[0]!]), false).replace(/^M[^C]*/, '') + 'Z';
  let back = fillHair(c, backD, 0.08);
  for (let i = 0; i < 7; i++) {
    const x = -hw * 1.1 + i * hw * 0.36;
    back += strand(c, [[x * 0.9, 0.6 * u], [x * 1.08, 2 * u], [x * 1.16, 3.1 * u]], 0.01, 0.5);
  }
  const top = cap(c, -0.08, 0.2, 0.55, 1.1);
  let front = fillHair(c, top, 0.06);
  let bangs = `M${r1(-hw * 0.98)} ${r1(0.08 * u)}Q0 ${r1(-0.08 * u)} ${r1(hw * 0.98)} ${r1(0.08 * u)}L${r1(hw * 0.98)} ${r1(0.38 * u)}`;
  for (let i = 1; i <= 10; i++) bangs += `L${r1(hw * 0.98 - (hw * 1.96 * i) / 10)} ${r1((0.4 + (i % 2 ? 0.035 : 0)) * u)}`;
  bangs += 'Z';
  front += fillHair(c, bangs, 0.03);
  front += shine(c, `${top}${bangs}`, 0.08, 1.1, 0.05);
  for (let i = 0; i < 6; i++) front += strand(c, [[-hw * 0.8 + i * hw * 0.32, 0.12 * u], [-hw * 0.8 + i * hw * 0.32, 0.36 * u]], 0.008, 0.6);
  for (const side of [1, -1]) {
    const lock = `M${r1(side * hw * 0.8)} ${r1(0.22 * u)}L${r1(side * hw * 1.08)} ${r1(0.2 * u)}L${r1(side * hw * 1.02)} ${r1(1.15 * u)}L${r1(side * hw * 0.74)} ${r1(1.12 * u)}Z`;
    front += fillHair(c, lock, 0.02);
    front += strand(c, [[side * hw * 0.92, 0.3 * u], [side * hw * 0.9, 1.05 * u]], 0.008, 0.6);
  }
  return { back, front, fringe: bangs };
}

function regent(c: Ctx): HairOut {
  const { u, hw } = c;
  const tail = tube([[hw * 0.4, 0.02 * u], [hw * 1.45, 0.3 * u], [hw * 1.75, 1.2 * u], [hw * 1.45, 2.3 * u]], [0.3 * u, 0.4 * u, 0.3 * u, 0.02 * u]);
  let back = fillHair(c, tail, 0.06);
  back += strand(c, [[hw * 0.6, 0.1 * u], [hw * 1.5, 0.5 * u], [hw * 1.6, 1.6 * u]], 0.012, 0.6);
  back += `<path d="${ellipse([hw * 0.95, 0.12 * u], 0.1 * u, 0.12 * u)}" fill="${c.look.accent}" stroke="${INK}" stroke-width="${r1(c.line)}" transform="rotate(30 ${pt([hw * 0.95, 0.12 * u])})"/>`;
  const top = cap(c, -0.02, 0.25, 0.46, 1.04);
  let front = fillHair(c, top, 0.05);
  // The regent: a quiff that rides out over the forehead like a prow.
  const quiff = smooth([[-hw * 0.75, 0.22 * u], [-hw * 0.9, -0.05 * u], [-hw * 0.3, -0.36 * u], [hw * 0.35, -0.42 * u], [hw * 0.8, -0.2 * u], [hw * 0.55, 0.02 * u], [hw * 0.1, 0.08 * u], [hw * 0.3, 0.22 * u]], true);
  front += fillHair(c, quiff, 0.06);
  front += shine(c, quiff, -0.28, 1, 0.07);
  for (let i = 0; i < 4; i++) front += strand(c, [[-hw * 0.6 + i * 0.08 * u, 0.16 * u], [-hw * 0.4 + i * 0.12 * u, -0.22 * u], [hw * 0.3 + i * 0.04 * u, -0.3 * u + i * 0.05 * u]], 0.011, 0.7);
  const loose = spike([-hw * 0.5, 0.12 * u], [-hw * 0.65, 0.55 * u], 0.12 * u, 0.3);
  front += fillHair(c, loose, 0.02);
  return { back, front, fringe: `${quiff}${loose}` };
}

function bob(c: Ctx): HairOut {
  const { u, hw } = c;
  const shape = smooth([[-hw * 1.18, 0.9 * u], [-hw * 1.22, 0.3 * u], [-hw * 0.8, -0.08 * u], [0, -0.12 * u], [hw * 0.8, -0.08 * u], [hw * 1.22, 0.3 * u], [hw * 1.18, 0.9 * u], [hw * 0.8, 0.94 * u], [hw * 0.86, 0.4 * u], [-hw * 0.86, 0.4 * u], [-hw * 0.8, 0.94 * u]], true);
  let back = '';
  if (c.look.wear.includes('headband')) {
    for (const [dy, len] of [[0.18, 1], [0.34, 0.8]] as const) {
      const d = tube([[hw * 0.95, dy * u], [hw * 1.6, (dy + 0.15) * u], [hw * 2.2 * len, (dy + 0.45) * u]], [0.12 * u, 0.1 * u, 0.02 * u]);
      back += c.s.shaded(d, c.look.accent, { off: 0.02 * u, line: c.line });
    }
  }
  let front = fillHair(c, shape, 0.06);
  front += shine(c, shape, 0.05, 1.1, 0.06);
  for (let i = 0; i < 5; i++) front += strand(c, [[-hw * 1.1 + i * 0.03 * u, 0.45 * u], [-hw * 1.12 + i * 0.03 * u, 0.86 * u]], 0.009, 0.6);
  for (let i = 0; i < 5; i++) front += strand(c, [[hw * 1.1 - i * 0.03 * u, 0.45 * u], [hw * 1.12 - i * 0.03 * u, 0.86 * u]], 0.009, 0.6);
  // Side-swept bangs, cut on a slant.
  const bangs = `M${r1(hw * 0.5)} ${r1(0.02 * u)}Q${r1(hw * 0.95)} ${r1(0.1 * u)} ${r1(hw * 0.9)} ${r1(0.4 * u)}L${r1(hw * 0.5)} ${r1(0.33 * u)}L${r1(hw * 0.2)} ${r1(0.42 * u)}L${r1(-hw * 0.2)} ${r1(0.4 * u)}L${r1(-hw * 0.55)} ${r1(0.5 * u)}L${r1(-hw * 0.95)} ${r1(0.52 * u)}Q${r1(-hw * 1.05)} ${r1(0.1 * u)} ${r1(hw * 0.5)} ${r1(0.02 * u)}Z`;
  front += fillHair(c, bangs, 0.03);
  for (let i = 0; i < 4; i++) front += strand(c, [[hw * 0.4 - i * 0.12 * u, 0.06 * u], [hw * 0.1 - i * 0.2 * u, 0.4 * u]], 0.009, 0.6);
  if (c.look.wear.includes('headband')) {
    const band = smooth([[-hw * 1.08, 0.2 * u], [0, 0.06 * u], [hw * 1.08, 0.2 * u], [hw * 1.06, 0.3 * u], [0, 0.16 * u], [-hw * 1.06, 0.3 * u]], true);
    front += c.s.shaded(band, c.look.accent, { off: 0.015 * u, line: c.line });
  }
  return { back, front, fringe: bangs };
}

function flowing(c: Ctx): HairOut {
  const { u, hw } = c;
  const mass: P[] = [[0, -0.12 * u], [hw * 1.2, 0.2 * u], [hw * 1.55, 1.1 * u], [hw * 1.75, 2.1 * u], [hw * 1.2, 2.5 * u], [hw * 0.6, 2.3 * u], [0, 2.6 * u], [-hw * 0.6, 2.3 * u], [-hw * 1.2, 2.5 * u], [-hw * 1.75, 2.1 * u], [-hw * 1.55, 1.1 * u], [-hw * 1.2, 0.2 * u]];
  const massD = smooth(mass, true);
  let back = fillHair(c, massD, 0.08);
  for (let i = 0; i < 8; i++) {
    const x = -hw * 1.4 + i * hw * 0.4;
    back += strand(c, [[x * 0.7, 0.5 * u], [x * 1.05, 1.5 * u], [x * 0.95, 2.3 * u]], 0.009, 0.45);
  }
  const top = cap(c, -0.12, 0.18, 0.5, 1.12);
  let front = fillHair(c, top, 0.06);
  front += shine(c, top, 0.02, 1.1, 0.06);
  let fringe = '';
  for (const side of [1, -1]) {
    const sweep = tube([[side * 0.03 * u, 0.03 * u], [side * hw * 0.62, 0.16 * u], [side * hw * 1.0, 0.42 * u], [side * hw * 1.02, 0.8 * u]], [0.14 * u, 0.2 * u, 0.16 * u, 0.02 * u]);
    fringe += sweep;
    front += fillHair(c, sweep, 0.03);
    front += strand(c, [[side * 0.06 * u, 0.05 * u], [side * hw * 0.65, 0.2 * u], [side * hw * 0.98, 0.7 * u]], 0.009, 0.6);
    const lock = tube([[side * hw * 1.0, 0.45 * u], [side * hw * 1.15, 1.1 * u], [side * hw * 1.0, 1.6 * u], [side * hw * 1.15, 2.0 * u]], [0.2 * u, 0.24 * u, 0.18 * u, 0.02 * u]);
    front += fillHair(c, lock, 0.03);
    front += strand(c, [[side * hw * 1.02, 0.6 * u], [side * hw * 1.12, 1.2 * u], [side * hw * 1.05, 1.8 * u]], 0.009, 0.55);
  }
  // A single strand across the face, the bishonen signature.
  front += c.s.ink(brush([[0.03 * u, 0.12 * u], [-0.02 * u, 0.36 * u], [0.02 * u, 0.62 * u]], 0.025 * u, { in: 0.1, out: 0.7 }), c.base);
  front += strand(c, [[0.03 * u, 0.12 * u], [-0.02 * u, 0.36 * u], [0.02 * u, 0.62 * u]], 0.007, 0.9);
  return { back, front, fringe };
}

function puff(c: Ctx): HairOut {
  const { u, hw, rand } = c;
  const center: P = [0, 0.34 * u];
  const spikes: Array<{ a: number; r: number; w: number }> = [];
  for (let i = 0; i < 13; i++) {
    const a = ((150 + (i * 240) / 12) * Math.PI) / 180;
    spikes.push({ a, r: u * (0.12 + rand() * 0.07), w: 0.48 });
  }
  const mass = crown(center, spikes, 0.56 * u);
  let back = fillHair(c, mass, 0.08);
  back += shine(c, mass, -0.05, 1.2, 0.08);
  const top = cap(c, -0.08, 0.2, 0.5, 1.06);
  let front = fillHair(c, top, 0.05);
  const bangs = [spike([-hw * 0.5, 0.12 * u], [-hw * 0.56, 0.42 * u], 0.3 * hw), spike([0, 0.1 * u], [0.02 * u, 0.4 * u], 0.34 * hw), spike([hw * 0.5, 0.12 * u], [hw * 0.6, 0.38 * u], 0.3 * hw)];
  for (const d of bangs) front += fillHair(c, d, 0.03);
  return { back, front, fringe: bangs.join('') };
}

function windswept(c: Ctx): HairOut {
  const { u, hw } = c;
  const mass: P[] = [[-hw * 0.4, -0.12 * u], [hw * 0.9, -0.02 * u], [hw * 1.7, 0.4 * u], [hw * 2.5, 0.9 * u], [hw * 2.2, 1.2 * u], [hw * 2.6, 1.7 * u], [hw * 1.9, 1.8 * u], [hw * 1.4, 2.4 * u], [hw * 0.8, 2.0 * u], [-hw * 0.6, 2.3 * u], [-hw * 1.3, 1.9 * u], [-hw * 1.3, 0.9 * u], [-hw * 1.2, 0.2 * u]];
  const massD = smooth(mass, true);
  let back = fillHair(c, massD, 0.09);
  for (let i = 0; i < 7; i++) back += strand(c, [[hw * (0.6 + i * 0.12), 0.2 * u + i * 0.1 * u], [hw * (1.4 + i * 0.12), 0.9 * u + i * 0.1 * u], [hw * (1.9 + i * 0.05), 1.5 * u + i * 0.05 * u]], 0.01, 0.5);
  const top = cap(c, -0.1, 0.18, 0.5, 1.12);
  let front = fillHair(c, top, 0.06);
  front += shine(c, top, 0.04, 1.05, 0.05);
  const sweep = tube([[-hw * 0.5, 0.02 * u], [hw * 0.2, 0.2 * u], [hw * 0.9, 0.5 * u], [hw * 1.4, 0.7 * u]], [0.18 * u, 0.26 * u, 0.2 * u, 0.02 * u]);
  front += fillHair(c, sweep, 0.03);
  front += strand(c, [[-hw * 0.4, 0.06 * u], [hw * 0.3, 0.24 * u], [hw * 1.2, 0.62 * u]], 0.009, 0.6);
  const loose = tube([[-hw * 0.1, 0.1 * u], [hw * 0.1, 0.45 * u], [hw * 0.45, 0.78 * u]], [0.06 * u, 0.05 * u, 0.01 * u]);
  front += fillHair(c, loose, 0.01);
  // A heavy braid over the shoulder: lobes that lean left and right in turn.
  let braid = '';
  const path: P[] = [[-hw * 0.95, 0.66 * u], [-hw * 1.05, 1.2 * u], [-hw * 0.98, 1.8 * u], [-hw * 0.92, 2.3 * u]];
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const seg = Math.min(2, Math.floor(t * 3));
    const a = lerp(path[seg]!, path[seg + 1]!, t * 3 - seg);
    const w = 0.15 * u * (1 - t * 0.4);
    const lean = i % 2 ? 1 : -1;
    const lobe = `M${pt(add(a, [-lean * w * 0.55, -w * 0.45]))}Q${pt(add(a, [lean * w * 0.9, -w * 0.2]))} ${pt(add(a, [lean * w * 0.5, w * 0.5]))}Q${pt(add(a, [-lean * w * 0.2, w * 0.35]))} ${pt(add(a, [-lean * w * 0.55, -w * 0.45]))}Z`;
    braid += c.s.shaded(lobe, c.base, { off: 0.02 * u, line: c.line * 0.9 });
  }
  braid += `<rect x="${r1(-hw * 0.92 - 0.06 * u)}" y="${r1(2.3 * u)}" width="${r1(0.12 * u)}" height="${r1(0.06 * u)}" fill="${c.look.accent}" stroke="${INK}" stroke-width="${r1(c.line * 0.8)}"/>`;
  braid += c.s.ink(brush([[-hw * 0.92, 2.36 * u], [-hw * 0.95, 2.55 * u]], 0.08 * u, { in: 0, out: 0.8 }), c.base);
  return { back, front: front + braid, fringe: sweep };
}

function explorer(c: Ctx): HairOut {
  const { u, hw } = c;
  const bobD = smooth([[-hw * 1.1, 0.78 * u], [-hw * 1.15, 0.3 * u], [-hw * 0.7, 0 * u], [hw * 0.7, 0], [hw * 1.15, 0.3 * u], [hw * 1.1, 0.78 * u], [hw * 0.85, 0.74 * u], [hw * 0.85, 0.36 * u], [0, 0.3 * u], [-hw * 0.85, 0.36 * u], [-hw * 0.85, 0.74 * u]], true);
  const tail = tube([[hw * 0.9, 0.55 * u], [hw * 1.45, 0.7 * u], [hw * 1.65, 1.0 * u]], [0.22 * u, 0.2 * u, 0.04 * u]);
  const back = fillHair(c, tail, 0.04);
  let front = fillHair(c, bobD, 0.05);
  front += strand(c, [[-hw * 0.3, 0.3 * u], [-hw * 0.6, 0.4 * u]], 0.014, 0.9);
  front += strand(c, [[hw * 0.2, 0.3 * u], [hw * 0.5, 0.38 * u]], 0.014, 0.9);
  return { back, front, fringe: bobD };
}

function curls(c: Ctx): HairOut {
  const { u, hw } = c;
  const mass: P[] = [[0, -0.14 * u], [hw * 1.3, 0.15 * u], [hw * 1.75, 0.9 * u], [hw * 2.1, 1.7 * u], [hw * 1.8, 2.6 * u], [hw * 0.9, 2.9 * u], [0, 2.7 * u], [-hw * 0.9, 2.9 * u], [-hw * 1.8, 2.6 * u], [-hw * 2.1, 1.7 * u], [-hw * 1.75, 0.9 * u], [-hw * 1.3, 0.15 * u]];
  const massD = smooth(mass, true);
  let back = fillHair(c, massD, 0.09);
  for (let i = 0; i < 9; i++) {
    const x = -hw * 1.8 + i * hw * 0.45;
    back += strand(c, [[x * 0.6, 0.6 * u], [x * 1.1, 1.5 * u], [x * 0.9, 2.2 * u], [x * 1.05, 2.6 * u]], 0.008, 0.45);
  }
  const top = cap(c, -0.14, 0.2, 0.55, 1.15);
  let front = fillHair(c, top, 0.06);
  front += shine(c, top, 0.0, 1.1, 0.05);
  // Drill curls: stacked coils that narrow as they fall.
  for (const side of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const y = (0.6 + i * 0.22) * u;
      const w = (0.17 - i * 0.02) * u;
      const cx = side * (hw * 1.2 + Math.sin(i) * 0.02 * u);
      const coil = ellipse([cx, y], w, 0.11 * u);
      front += fillHair(c, coil, 0.02);
      front += c.s.ink(brush([[cx - w * 0.6, y - 0.05 * u], [cx, y - 0.075 * u], [cx + w * 0.6, y - 0.04 * u]], 0.022 * u, { in: 0.3, out: 0.3 }), c.light, 0.9);
      front += strand(c, [[cx - side * w * 0.8, y + 0.02 * u], [cx, y + 0.07 * u], [cx + side * w * 0.8, y + 0.03 * u]], 0.008, 0.7);
    }
  }
  // A big side-swept wave of bangs.
  const wave = tube([[hw * 0.6, 0.0], [hw * 0.1, 0.2 * u], [-hw * 0.6, 0.3 * u], [-hw * 1.05, 0.55 * u], [-hw * 0.8, 0.72 * u]], [0.18 * u, 0.26 * u, 0.22 * u, 0.14 * u, 0.02 * u]);
  front += fillHair(c, wave, 0.03);
  for (let i = 0; i < 3; i++) front += strand(c, [[hw * 0.5, 0.04 * u + i * 0.03 * u], [-hw * 0.2, 0.24 * u + i * 0.04 * u], [-hw * 0.95, 0.56 * u]], 0.008, 0.65);
  return { back, front, fringe: wave };
}

function crop(c: Ctx): HairOut {
  const { u, hw } = c;
  const d = `M${r1(-hw * 1.02)} ${r1(0.46 * u)}L${r1(-hw * 1.05)} ${r1(0.12 * u)}Q${r1(-hw * 0.9)} ${r1(-0.04 * u)} ${r1(-hw * 0.4)} ${r1(-0.05 * u)}L${r1(hw * 0.4)} ${r1(-0.05 * u)}Q${r1(hw * 0.9)} ${r1(-0.04 * u)} ${r1(hw * 1.05)} ${r1(0.12 * u)}L${r1(hw * 1.02)} ${r1(0.46 * u)}L${r1(hw * 0.86)} ${r1(0.3 * u)}L${r1(hw * 0.6)} ${r1(0.16 * u)}L${r1(hw * 0.2)} ${r1(0.2 * u)}L0 ${r1(0.14 * u)}L${r1(-hw * 0.2)} ${r1(0.2 * u)}L${r1(-hw * 0.6)} ${r1(0.16 * u)}L${r1(-hw * 0.86)} ${r1(0.3 * u)}Z`;
  let front = fillHair(c, d, 0.04);
  // Short bristles, hatched in.
  for (let i = 0; i < 16; i++) {
    const x = -hw * 0.95 + i * ((hw * 1.9) / 15);
    front += strand(c, [[x, 0.0 * u + Math.abs(x) * 0.08], [x + 0.01 * u, 0.1 * u + Math.abs(x) * 0.12]], 0.008, 0.7);
  }
  return { back: '', front, fringe: '' };
}

function twintails(c: Ctx): HairOut {
  const { u, hw } = c;
  let back = '';
  for (const side of [1, -1]) {
    const tail = tube([[side * hw * 0.85, 0.15 * u], [side * hw * 1.9, 0.5 * u], [side * hw * 2.2, 1.3 * u], [side * hw * 1.8, 2.1 * u], [side * hw * 2.1, 2.5 * u]], [0.3 * u, 0.42 * u, 0.36 * u, 0.2 * u, 0.02 * u]);
    back += fillHair(c, tail, 0.06);
    back += strand(c, [[side * hw * 1.2, 0.3 * u], [side * hw * 2.0, 0.9 * u], [side * hw * 1.9, 1.9 * u]], 0.01, 0.55);
  }
  const top = cap(c, -0.08, 0.22, 0.5, 1.08);
  let front = fillHair(c, top, 0.05);
  front += shine(c, top, 0.06, 1.05, 0.05);
  let fringe = '';
  const roots = [-0.7, -0.35, 0, 0.35, 0.7];
  roots.forEach((x, i) => {
    const d = `M${r1(x * hw - 0.17 * hw)} ${r1(0.12 * u)}Q${r1(x * hw - 0.1 * hw)} ${r1(0.4 * u)} ${r1(x * hw + (i - 2) * 0.01 * u)} ${r1((0.44 + (i % 2) * 0.05) * u)}Q${r1(x * hw + 0.12 * hw)} ${r1(0.34 * u)} ${r1(x * hw + 0.2 * hw)} ${r1(0.12 * u)}Z`;
    fringe += d;
    front += fillHair(c, d, 0.02);
  });
  // Ribbons at the roots of the tails.
  for (const side of [1, -1]) {
    const k: P = [side * hw * 0.98, 0.14 * u];
    const loopA = smooth([k, add(k, [side * 0.14 * u, -0.14 * u]), add(k, [side * 0.22 * u, -0.02 * u])], true);
    const loopB = smooth([k, add(k, [side * -0.1 * u, -0.16 * u]), add(k, [side * -0.16 * u, -0.02 * u])], true);
    front += c.s.shaded(loopA, c.look.accent, { off: 0.02 * u, line: c.line }) + c.s.shaded(loopB, c.look.accent, { off: 0.02 * u, line: c.line });
    front += `<circle cx="${r1(k[0])}" cy="${r1(k[1])}" r="${r1(0.04 * u)}" fill="${shade(c.look.accent, -0.2)}" stroke="${INK}" stroke-width="${r1(c.line)}"/>`;
  }
  return { back, front, fringe };
}

function hooded(c: Ctx): HairOut {
  const { u, hw } = c;
  const hoodC = c.look.outfit;
  const outer = smooth([[-hw * 1.35, 1.05 * u], [-hw * 1.45, 0.3 * u], [-hw * 0.9, -0.2 * u], [0, -0.3 * u], [hw * 0.9, -0.2 * u], [hw * 1.45, 0.3 * u], [hw * 1.35, 1.05 * u]], false) + 'Z';
  const back = c.s.shaded(outer, hoodC, { off: 0.08 * u, line: c.line });
  const top = cap(c, -0.06, 0.2, 0.5, 1.06);
  let front = fillHair(c, top, 0.05);
  // Long bangs that hide the right eye entirely.
  const veil = tube([[0.0, 0.05 * u], [hw * 0.45, 0.3 * u], [hw * 0.8, 0.62 * u], [hw * 0.75, 0.86 * u]], [0.26 * u, 0.4 * u, 0.3 * u, 0.02 * u]);
  front += fillHair(c, veil, 0.04);
  for (let i = 0; i < 3; i++) front += strand(c, [[0.02 * u + i * 0.04 * u, 0.1 * u], [hw * 0.45 + i * 0.04 * u, 0.4 * u], [hw * 0.72, 0.78 * u]], 0.009, 0.6);
  const lockL = spike([-hw * 0.55, 0.1 * u], [-hw * 0.7, 0.46 * u], 0.26 * hw, 0.2);
  front += fillHair(c, lockL, 0.02);
  // The rim of the hood frames the face.
  const rim = `M${r1(-hw * 1.35)} ${r1(1.05 * u)}Q${r1(-hw * 1.3)} ${r1(0.05 * u)} 0 ${r1(-0.16 * u)}Q${r1(hw * 1.3)} ${r1(0.05 * u)} ${r1(hw * 1.35)} ${r1(1.05 * u)}L${r1(hw * 1.1)} ${r1(1.0 * u)}Q${r1(hw * 1.12)} ${r1(0.12 * u)} 0 ${r1(-0.06 * u)}Q${r1(-hw * 1.12)} ${r1(0.12 * u)} ${r1(-hw * 1.1)} ${r1(1.0 * u)}Z`;
  front += c.s.shaded(rim, hoodC, { off: 0.03 * u, line: c.line });
  return { back, front, fringe: `${veil}${lockL}` };
}

const DRAW: Record<Look['hair'], (c: Ctx) => HairOut> = { spiky, hime, regent, bob, flowing, puff, windswept, explorer, curls, crop, twintails, hooded };

export function hair(s: Sheet, spec: StyleSpec, look: Look, u: number, seed: string): HairOut {
  const c: Ctx = {
    s,
    spec,
    look,
    u,
    hw: (spec.headW * u) / 2,
    base: look.hairColor,
    dark: shade(look.hairColor, -0.35),
    light: hairLight(look.hairColor),
    line: 1.5 * spec.line,
    rand: rng(seed),
  };
  return DRAW[look.hair](c);
}

