import type { Look, Prop } from '@duskline/core';
import { mix, shade } from '../color';
import { type P, add, brush, deg, ellipse, flipX, lerp, mul, perp, pt, r1, smooth, sparkle, sub, tube, unit } from './geom';
import { INK, PAPER, type Sheet } from './ink';
import type { StyleSpec } from './styles';

/**
 * Bodies, costumes and props. The skeleton is worked out from the tradition's head count, so a
 * chibi and a bishonen share the same code at 2.6 and 8.4 heads tall. A pose comes from the prop
 * the hero carries. Everything is drawn in figure space: a 240 x 400 canvas, feet on y = 388.
 */

export const CANVAS_W = 240;
export const CANVAS_H = 400;
const FEET = 388;
const CX = 120;

export interface Skel {
  u: number;
  hw: number;
  k: number;
  top: number;
  chin: number;
  sh: number;
  chest: number;
  waist: number;
  hip: number;
  knee: number;
  foot: number;
  shW: number;
  waistW: number;
  hipW: number;
  neckW: number;
  thigh: number;
  upperArm: number;
  foreArm: number;
}

export function skeleton(spec: StyleSpec, look: Look): Skel {
  const H = 330 * look.height;
  const u = H / spec.heads;
  const top = FEET - H;
  const chin = top + u;
  const L = H - u;
  const k = Math.max(0, Math.min(1, (spec.heads - 2.6) / (8.4 - 2.6)));
  const headWpx = spec.headW * u;
  const at = (a: number, b: number): number => chin + L * (a + (b - a) * k);
  return {
    u,
    hw: headWpx / 2,
    k,
    top,
    chin,
    sh: chin + spec.neck * u * 0.75 + 0.05 * u,
    chest: at(0.2, 0.17),
    waist: at(0.36, 0.33),
    hip: at(0.46, 0.44),
    knee: at(0.72, 0.71),
    foot: FEET,
    shW: (spec.shoulders * headWpx) / 2,
    waistW: (spec.waist * headWpx) / 2 * 0.78,
    hipW: (spec.hips * headWpx) / 2 * 0.8,
    neckW: headWpx * (spec.eye === 'gekiga' ? 0.62 : spec.eye === 'chibi' ? 0.36 : 0.44),
    thigh: u * (0.42 + 0.1 * k) * (spec.eye === 'gekiga' ? 1.25 : spec.eye === 'bishonen' || spec.eye === 'shoujo' ? 0.85 : 1),
    upperArm: u * (0.34 + 1.02 * k),
    foreArm: u * (0.3 + 0.86 * k),
  };
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------

/** Arm angles in degrees from hanging straight down; positive swings away from the body. */
interface ArmPose {
  up: number;
  fore: number;
}

interface Pose {
  right: ArmPose;
  left: ArmPose;
  /** Feet apart, as a fraction of hip width. */
  stance: number;
}

const POSES: Record<Prop, Pose> = {
  lantern: { right: { up: 118, fore: 168 }, left: { up: 16, fore: 4 }, stance: 0.75 },
  blade: { right: { up: 22, fore: 34 }, left: { up: 20, fore: -34 }, stance: 0.8 },
  rail: { right: { up: 36, fore: -160 }, left: { up: 42, fore: -100 }, stance: 1.05 },
  needle: { right: { up: 24, fore: -118 }, left: { up: 12, fore: 8 }, stance: 0.8 },
  greatsword: { right: { up: 14, fore: -56 }, left: { up: 14, fore: -56 }, stance: 0.9 },
  kite: { right: { up: 132, fore: 150 }, left: { up: 58, fore: 110 }, stance: 0.7 },
  baton: { right: { up: 138, fore: 176 }, left: { up: 18, fore: -128 }, stance: 0.7 },
  buoy: { right: { up: 18, fore: 14 }, left: { up: 16, fore: -22 }, stance: 0.8 },
  compass: { right: { up: 20, fore: -96 }, left: { up: 12, fore: -38 }, stance: 0.75 },
  wire: { right: { up: 96, fore: 150 }, left: { up: 38, fore: -104 }, stance: 0.65 },
  trowel: { right: { up: 16, fore: -6 }, left: { up: 20, fore: 2 }, stance: 1.05 },
  chochin: { right: { up: 24, fore: -34 }, left: { up: 16, fore: -118 }, stance: 0.75 },
};

interface Arm {
  side: 1 | -1;
  shoulder: P;
  elbow: P;
  hand: P;
  /** Direction the forearm points, for orienting the hand. */
  dir: P;
}

function arm(sk: Skel, side: 1 | -1, p: ArmPose): Arm {
  const shoulder: P = [CX + side * sk.shW * 0.92, sk.sh + 0.06 * sk.u];
  const d = (a: number): P => [side * Math.sin(deg(a)), Math.cos(deg(a))];
  const elbow = add(shoulder, mul(d(p.up), sk.upperArm));
  const hand = add(elbow, mul(d(p.fore), sk.foreArm));
  return { side, shoulder, elbow, hand, dir: unit(sub(hand, elbow)) };
}

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

export interface Layers {
  /** Behind everything: capes, coat backs, long hair (added by the figure). */
  back: string[];
  legs: string[];
  torso: string[];
  over: string[];
  arms: string[];
  front: string[];
  /** Soft light, drawn outside the ink outline so it is not outlined. */
  glow: string[];
}

interface B {
  s: Sheet;
  spec: StyleSpec;
  look: Look;
  sk: Skel;
  line: number;
  L: Layers;
  right: Arm;
  left: Arm;
  wear: Set<string>;
}

const has = (b: B, w: string): boolean => b.wear.has(w);

/** Fold lines: a few tapered strokes that tell you the cloth is cloth. */
function folds(b: B, lines: P[][], w = 0.012, opacity = 0.7): string {
  return lines.map((l) => b.s.ink(brush(l, w * b.sk.u * b.spec.line, { in: 0.35, out: 0.5 }), INK, opacity)).join('');
}

function shaded(b: B, d: string, color: string, off = 0.08): string {
  return b.s.shaded(d, color, { off: off * b.sk.u, line: b.line });
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function torsoPath(sk: Skel, flare = 1, hem?: number): string {
  const { u } = sk;
  const right: P[] = [
    [CX + sk.neckW * 0.5, sk.sh - 0.08 * u],
    [CX + sk.shW * 0.8, sk.sh],
    [CX + sk.shW, sk.sh + 0.14 * u],
    [CX + sk.shW * 0.84, sk.chest],
    [CX + sk.waistW, sk.waist],
    [CX + sk.hipW * flare, hem ?? sk.hip],
  ];
  const bottom = hem ?? sk.hip;
  return `${smooth([...right.slice().reverse().map((p) => flipX(p, CX)), ...right], false).replace(/Z$/, '')}L${r1(CX + sk.hipW * flare)} ${r1(bottom + 0.06 * u)}L${r1(CX - sk.hipW * flare)} ${r1(bottom + 0.06 * u)}Z`;
}

function neck(b: B): string {
  const { sk } = b;
  const { u } = sk;
  const d = `M${r1(CX - sk.neckW / 2)} ${r1(sk.chin - 0.28 * u)}L${r1(CX + sk.neckW / 2)} ${r1(sk.chin - 0.28 * u)}L${r1(CX + sk.neckW * 0.56)} ${r1(sk.sh + 0.02 * u)}L${r1(CX - sk.neckW * 0.56)} ${r1(sk.sh + 0.02 * u)}Z`;
  let out = shaded(b, d, b.look.skin, 0.05);
  // The jaw throws a shadow onto the neck.
  const clip = b.s.uid('n');
  out += `<clipPath id="${clip}"><path d="${d}"/></clipPath><g clip-path="url(#${clip})">${b.s.castShadow(`M${r1(CX - sk.neckW)} ${r1(sk.chin - 0.3 * u)}H${r1(CX + sk.neckW)}V${r1(sk.chin + 0.06 * u)}Q${r1(CX)} ${r1(sk.chin + 0.14 * u)} ${r1(CX - sk.neckW)} ${r1(sk.chin + 0.06 * u)}Z`, b.look.skin)}</g>`;
  return out;
}

function hand(b: B, a: Arm, fist: boolean, color = b.look.skin): string {
  const { u } = b.sk;
  const size = u * (0.13 + 0.06 * b.sk.k) * (b.spec.eye === 'gekiga' ? 1.3 : 1);
  const ang = (Math.atan2(a.dir[1], a.dir[0]) * 180) / Math.PI - 90;
  const d = fist
    ? `M${r1(-size * 0.55)} ${r1(-size * 0.2)}Q${r1(-size * 0.6)} ${r1(size * 0.9)} 0 ${r1(size * 0.95)}Q${r1(size * 0.62)} ${r1(size * 0.9)} ${r1(size * 0.55)} ${r1(-size * 0.2)}Z`
    : `M${r1(-size * 0.5)} ${r1(-size * 0.2)}Q${r1(-size * 0.62)} ${r1(size * 1.1)} ${r1(-size * 0.05)} ${r1(size * 1.25)}Q${r1(size * 0.6)} ${r1(size * 1.05)} ${r1(size * 0.5)} ${r1(-size * 0.2)}Z`;
  let out = b.s.shaded(d, color, { off: size * 0.25, line: b.line * 0.9 });
  out += b.s.ink(brush([[-size * 0.3, size * (fist ? 0.35 : 0.5)], [size * 0.25, size * (fist ? 0.4 : 0.55)]], size * 0.1, { in: 0.3, out: 0.3 }), INK, 0.6);
  if (fist) out += b.s.ink(brush([[-size * 0.35, size * 0.65], [size * 0.3, size * 0.7]], size * 0.08, { in: 0.3, out: 0.3 }), INK, 0.5);
  return `<g transform="translate(${pt(a.hand)}) rotate(${r1(ang)})">${out}</g>`;
}

function sleeve(b: B, a: Arm, color: string, o: { cuff?: string; rolled?: boolean; puff?: boolean; wide?: boolean; gauntlet?: string } = {}): string {
  const { sk } = b;
  const brawn = b.spec.eye === 'gekiga' ? 1.25 : 1;
  const wU = sk.thigh * 0.56 * brawn;
  const wF = sk.thigh * 0.48 * brawn;
  const wW = sk.thigh * 0.38 * brawn;
  let out = '';
  if (o.wide) {
    // A kimono sleeve: a deep bag of cloth hanging from the forearm.
    const e = a.elbow;
    const h = a.hand;
    const drop = sk.u * 0.9;
    const bag = smooth([add(a.shoulder, [a.side * -wU * 0.3, -wU * 0.2]), add(e, [a.side * wU * 0.7, 0]), add(lerp(e, h, 0.8), [a.side * wU * 0.6, drop * 0.6]), add(lerp(e, h, 0.6), [0, drop]), add(lerp(e, h, 0.3), [-a.side * wU * 0.4, drop * 0.7]), add(e, [-a.side * wU * 0.8, 0])], true);
    out += shaded(b, bag, color, 0.1);
    out += folds(b, [[add(e, [0, wU * 0.3]), add(lerp(e, h, 0.5), [0, drop * 0.7])]]);
    out += shaded(b, tube([lerp(e, h, 0.4), h], [wF, wW]), o.cuff ?? color, 0.05);
    return out;
  }
  const upper = tube([a.shoulder, a.elbow], [wU * (o.puff ? 1.7 : 1), wF]);
  const fore = tube([a.elbow, a.hand], [wF, wW]);
  if (o.rolled) {
    out += shaded(b, fore, b.look.skin, 0.06);
    out += folds(b, [[lerp(a.elbow, a.hand, 0.3), lerp(a.elbow, a.hand, 0.55)]], 0.01, 0.5);
    out += shaded(b, upper, color, 0.07);
    out += shaded(b, tube([lerp(a.shoulder, a.elbow, 0.85), lerp(a.elbow, a.hand, 0.12)], [wF * 1.3, wF * 1.25]), shade(color, -0.08), 0.03);
    return out;
  }
  if (o.puff) {
    out += shaded(b, fore, o.gauntlet ?? b.look.skin, 0.05);
    out += shaded(b, ellipse(lerp(a.shoulder, a.elbow, 0.35), wU * 0.9, wU * 0.75), color, 0.08);
    return out;
  }
  out += shaded(b, upper, color, 0.07);
  out += shaded(b, fore, color, 0.07);
  out += folds(b, [[add(a.elbow, mul(perp(a.dir), wF * 0.3)), add(a.elbow, add(mul(a.dir, wF * 0.6), mul(perp(a.dir), -wF * 0.2)))]], 0.01, 0.6);
  if (o.gauntlet) out += shaded(b, tube([lerp(a.elbow, a.hand, 0.35), a.hand], [wF * 1.15, wW * 1.2]), o.gauntlet, 0.05);
  if (o.cuff) out += shaded(b, tube([lerp(a.elbow, a.hand, 0.82), lerp(a.elbow, a.hand, 0.98)], [wW * 1.25, wW * 1.2], false), o.cuff, 0.02);
  return out;
}

function legs(b: B, o: { pants: string; boots?: string; bootTop?: number; bare?: boolean; geta?: boolean; socks?: string; wide?: boolean }): string {
  const { sk } = b;
  const { u } = sk;
  const stance = POSES[b.look.prop].stance;
  let out = '';
  for (const side of [-1, 1] as const) {
    const hipJ: P = [CX + side * sk.hipW * 0.5, sk.hip - 0.1 * u];
    const kneeJ: P = [CX + side * sk.hipW * 0.55 * stance, sk.knee];
    const ankle: P = [CX + side * sk.hipW * 0.62 * stance, sk.foot - u * (0.1 + 0.06 * sk.k)];
    const wTop = sk.thigh * (o.wide ? 1.35 : 1);
    const leg = tube([hipJ, kneeJ, ankle], [wTop, sk.thigh * (o.wide ? 1.2 : 0.72), sk.thigh * (o.wide ? 1.1 : 0.46)], false);
    out += shaded(b, leg, o.bare ? b.look.skin : o.pants, 0.07);
    if (o.wide) out += folds(b, [[lerp(hipJ, kneeJ, 0.3), lerp(kneeJ, ankle, 0.9)], [add(lerp(hipJ, kneeJ, 0.2), [side * sk.thigh * 0.3, 0]), add(ankle, [side * sk.thigh * 0.35, -0.05 * u])]], 0.012, 0.6);
    else out += folds(b, [[add(kneeJ, [-side * sk.thigh * 0.15, -0.05 * u]), add(kneeJ, [side * sk.thigh * 0.1, 0.05 * u])]], 0.01, 0.55);
    if (o.socks) out += shaded(b, tube([lerp(kneeJ, ankle, 0.1), ankle], [sk.thigh * 0.66, sk.thigh * 0.48], false), o.socks, 0.04);
    const footW = sk.thigh * (0.7 + 0.1 * (1 - sk.k));
    const footH = u * (0.12 + 0.06 * (1 - sk.k));
    if (o.geta) {
      out += b.s.flat(`M${r1(ankle[0] - footW * 0.6)} ${r1(sk.foot - footH * 0.9)}h${r1(footW * 1.2)}v${r1(footH * 0.45)}h${r1(-footW * 1.2)}Z`, '#8A6A48', b.line);
      out += b.s.flat(ellipse([ankle[0], sk.foot - footH * 1.05], footW * 0.52, footH * 0.5), PAPER, b.line);
      out += b.s.flat(`M${r1(ankle[0] - footW * 0.5)} ${r1(sk.foot - footH * 0.45)}h${r1(footW * 0.25)}v${r1(footH * 0.45)}h${r1(-footW * 0.25)}ZM${r1(ankle[0] + footW * 0.25)} ${r1(sk.foot - footH * 0.45)}h${r1(footW * 0.25)}v${r1(footH * 0.45)}h${r1(-footW * 0.25)}Z`, '#6A4E34', b.line * 0.8);
      continue;
    }
    const boot = o.boots ?? '#241E28';
    if (o.bootTop !== undefined) {
      const bt = lerp(kneeJ, ankle, o.bootTop);
      out += shaded(b, tube([bt, ankle], [sk.thigh * 0.68, sk.thigh * 0.56], false), boot, 0.05);
      out += b.s.flat(`M${r1(bt[0] - sk.thigh * 0.36)} ${r1(bt[1])}h${r1(sk.thigh * 0.72)}`, 'none', b.line);
    }
    const shoe = `M${r1(ankle[0] - footW * 0.5)} ${r1(ankle[1] - footH * 0.2)}Q${r1(ankle[0] - footW * 0.7)} ${r1(sk.foot)} ${r1(ankle[0] - footW * 0.1 + side * footW * 0.1)} ${r1(sk.foot)}L${r1(ankle[0] + footW * 0.35 + side * footW * 0.15)} ${r1(sk.foot)}Q${r1(ankle[0] + footW * 0.72 + side * footW * 0.1)} ${r1(sk.foot - footH * 0.2)} ${r1(ankle[0] + footW * 0.5)} ${r1(ankle[1] - footH * 0.2)}Z`;
    out += shaded(b, shoe, boot, 0.04);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Nudge a point so a prop of radius r stays inside the canvas. */
function inside(p: P, r: number): P {
  return [Math.max(r + 4, Math.min(CANVAS_W - r - 4, p[0])), Math.max(r + 4, p[1])];
}

function glowAt(c: P, r: number, color: string): string {
  return `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="${color}" opacity=".16"/><circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.55)}" fill="${color}" opacity=".18"/>`;
}

function prop(b: B): void {
  const { sk, look, s } = b;
  const { u } = sk;
  const a = look.accent;
  const metal = '#D9D4E6';
  const R = b.right;
  const lw = b.line;
  const scale = Math.max(0.55, Math.min(1, u / 60));
  switch (look.prop) {
    case 'lantern': {
      const top = add(R.hand, [0, u * 0.1]);
      const h = u * 0.5 * (0.7 + 0.3 * sk.k);
      const w = h * 0.62;
      const body: P = add(top, [0, h * 0.35]);
      b.L.front.push(s.ink(brush([add(R.hand, [-w * 0.3, 0]), add(R.hand, [0, -h * 0.08]), add(R.hand, [w * 0.3, 0]), top], w * 0.12, { in: 0, out: 0 })));
      const cage = `M${r1(body[0] - w * 0.5)} ${r1(body[1])}L${r1(body[0] - w * 0.36)} ${r1(body[1] - h * 0.14)}H${r1(body[0] + w * 0.36)}L${r1(body[0] + w * 0.5)} ${r1(body[1])}V${r1(body[1] + h * 0.6)}L${r1(body[0] + w * 0.36)} ${r1(body[1] + h * 0.74)}H${r1(body[0] - w * 0.36)}L${r1(body[0] - w * 0.5)} ${r1(body[1] + h * 0.6)}Z`;
      b.L.glow.push(glowAt(add(body, [0, h * 0.3]), h * 1.3, a));
      b.L.front.push(s.flat(cage, shade(a, -0.35), lw));
      b.L.front.push(s.flat(`M${r1(body[0] - w * 0.3)} ${r1(body[1] + h * 0.04)}H${r1(body[0] + w * 0.3)}V${r1(body[1] + h * 0.56)}H${r1(body[0] - w * 0.3)}Z`, mix(a, '#FFF3D6', 0.55), lw * 0.7));
      b.L.front.push(`<path d="${ellipse(add(body, [0, h * 0.3]), w * 0.13, h * 0.18)}" fill="#FFFFFF"/>`);
      b.L.front.push(s.ink(brush([add(body, [0, h * 0.04]), add(body, [0, h * 0.56])], w * 0.06, { in: 0, out: 0 }), INK, 0.8));
      return;
    }
    case 'blade': {
      const dir = R.dir;
      const hilt = R.hand;
      const tip = add(hilt, mul(unit(add(dir, [0.35 * R.side, 0.1])), u * 3.2 * scale));
      const nrm = unit(perp(sub(tip, hilt)));
      const mid = add(lerp(hilt, tip, 0.55), mul(nrm, u * 0.08 * R.side));
      const bw = u * 0.09 * scale;
      const blade = `M${pt(add(hilt, mul(nrm, bw)))}Q${pt(add(mid, mul(nrm, bw)))} ${pt(tip)}Q${pt(sub(mid, mul(nrm, bw * 0.8)))} ${pt(sub(hilt, mul(nrm, bw * 0.8)))}Z`;
      b.L.front.push(s.flat(blade, metal, lw));
      b.L.front.push(s.ink(brush([lerp(hilt, tip, 0.1), lerp(hilt, mid, 0.6), lerp(mid, tip, 0.8)], bw * 0.5, { in: 0.1, out: 0.6 }), a, 0.9));
      const grip = sub(hilt, mul(unit(sub(tip, hilt)), u * 0.5 * scale));
      b.L.front.push(s.flat(tube([hilt, grip], [bw * 2.1, bw * 1.9]), '#2A2240', lw));
      for (let i = 1; i < 4; i++) b.L.front.push(s.ink(brush([add(lerp(hilt, grip, i / 4), mul(nrm, bw)), sub(lerp(hilt, grip, i / 4 + 0.08), mul(nrm, bw))], bw * 0.4, { in: 0, out: 0 }), a, 0.8));
      b.L.front.push(s.flat(ellipse(hilt, bw * 2.2, bw * 1.1), shade(a, -0.3), lw));
      return;
    }
    case 'rail': {
      const back = add(R.hand, [R.side * u * 1.6 * scale, -u * 1.9 * scale]);
      const fore = add(R.hand, [-R.side * u * 0.5 * scale, u * 0.55 * scale]);
      b.L.back.push(s.flat(tube([back, R.hand], [u * 0.2 * scale, u * 0.2 * scale], false), '#5E5868', lw));
      b.L.front.push(s.flat(tube([R.hand, fore], [u * 0.2 * scale, u * 0.2 * scale], false), '#5E5868', lw));
      b.L.front.push(s.ink(brush([R.hand, fore], u * 0.05 * scale, { in: 0, out: 0 }), a, 0.9));
      b.L.back.push(s.ink(brush([back, R.hand], u * 0.05 * scale, { in: 0, out: 0 }), a, 0.9));
      return;
    }
    case 'needle': {
      for (let i = 0; i < 3; i++) {
        const ang = -1.2 + i * 0.32;
        const d: P = [R.side * Math.cos(ang), Math.sin(ang)];
        const tip = add(R.hand, mul(d, u * 0.95 * scale));
        b.L.front.push(s.flat(tube([add(R.hand, mul(d, u * 0.1)), tip], [u * 0.05 * scale, u * 0.01], false), metal, lw * 0.7));
        b.L.glow.push(`<path d="${sparkle(tip, u * 0.12 * scale)}" fill="${a}" opacity=".85"/>`);
      }
      return;
    }
    case 'greatsword': {
      const hilt: P = [CX, (b.right.hand[1] + b.left.hand[1]) / 2 - u * 0.1];
      const tip: P = [CX, sk.foot - u * 0.02];
      const bw = u * 0.2 * scale;
      b.L.front.push(s.flat(`M${r1(CX - bw)} ${r1(hilt[1] + u * 0.25)}L${r1(CX + bw)} ${r1(hilt[1] + u * 0.25)}L${r1(CX + bw * 0.8)} ${r1(tip[1] - bw * 1.6)}L${pt(tip)}L${r1(CX - bw * 0.8)} ${r1(tip[1] - bw * 1.6)}Z`, metal, lw));
      b.L.front.push(s.ink(brush([[CX, hilt[1] + u * 0.3], [CX, tip[1] - bw * 1.4]], bw * 0.18, { in: 0.1, out: 0.3 }), a, 0.9));
      b.L.front.push(s.tone(`M${r1(CX)} ${r1(hilt[1] + u * 0.25)}L${r1(CX + bw)} ${r1(hilt[1] + u * 0.25)}L${r1(CX + bw * 0.8)} ${r1(tip[1] - bw * 1.6)}L${pt(tip)}Z`, 'dotS', 0.5));
      b.L.front.push(s.flat(`M${r1(CX - bw * 3)} ${r1(hilt[1] + u * 0.14)}Q${r1(CX)} ${r1(hilt[1] + u * 0.3)} ${r1(CX + bw * 3)} ${r1(hilt[1] + u * 0.14)}L${r1(CX + bw * 2.8)} ${r1(hilt[1] + u * 0.3)}Q${r1(CX)} ${r1(hilt[1] + u * 0.44)} ${r1(CX - bw * 2.8)} ${r1(hilt[1] + u * 0.3)}Z`, mix(a, '#E8C060', 0.5), lw));
      b.L.front.push(s.flat(tube([[CX, hilt[1] + u * 0.16], [CX, hilt[1] - u * 0.35]], [bw * 0.8, bw * 0.7]), '#3A2A2A', lw));
      b.L.front.push(s.flat(ellipse([CX, hilt[1] - u * 0.42], bw * 0.7, bw * 0.7), a, lw));
      return;
    }
    case 'kite': {
      const kw = u * 0.42;
      const k: P = inside(add(R.hand, [R.side * u * 0.3, -u * 0.9]), kw * 0.7);
      const kite = `M${r1(k[0])} ${r1(k[1] - kw)}L${r1(k[0] + kw * 0.62)} ${r1(k[1])}L${r1(k[0])} ${r1(k[1] + kw * 1.1)}L${r1(k[0] - kw * 0.62)} ${r1(k[1])}Z`;
      b.L.back.push(`<path d="M${pt(R.hand)}Q${r1(R.hand[0] + R.side * u * 0.1)} ${r1(R.hand[1] - u * 0.6)} ${r1(k[0])} ${r1(k[1] + kw * 1.1)}" fill="none" stroke="${INK}" stroke-width="${r1(lw * 0.6)}"/>`);
      b.L.back.push(s.shaded(kite, a, { off: kw * 0.12, line: lw }));
      b.L.back.push(`<path d="M${r1(k[0])} ${r1(k[1] - kw)}V${r1(k[1] + kw * 1.1)}M${r1(k[0] - kw * 0.62)} ${r1(k[1])}H${r1(k[0] + kw * 0.62)}" stroke="${INK}" stroke-width="${r1(lw * 0.6)}"/>`);
      b.L.back.push(`<circle cx="${r1(k[0])}" cy="${r1(k[1])}" r="${r1(kw * 0.16)}" fill="${shade(a, -0.3)}" stroke="${INK}" stroke-width="${r1(lw * 0.6)}"/>`);
      for (let i = 0; i < 3; i++) {
        const c = add(k, [-R.side * kw * (0.2 + i * 0.35), kw * (1.35 + i * 0.3)]);
        b.L.back.push(s.flat(`M${r1(c[0] - kw * 0.14)} ${r1(c[1] - kw * 0.08)}L${r1(c[0] + kw * 0.14)} ${r1(c[1] + kw * 0.08)}L${r1(c[0] + kw * 0.14)} ${r1(c[1] - kw * 0.08)}L${r1(c[0] - kw * 0.14)} ${r1(c[1] + kw * 0.08)}Z`, i % 2 ? PAPER : a, lw * 0.6));
      }
      return;
    }
    case 'baton': {
      const tip = add(R.hand, mul(R.dir, u * 0.9 * scale));
      b.L.front.push(s.flat(tube([R.hand, tip], [u * 0.05, u * 0.02], false), PAPER, lw * 0.8));
      b.L.glow.push(`<path d="${sparkle(tip, u * 0.2 * scale)}" fill="#FFF3C8"/>`);
      for (let i = 1; i <= 3; i++) b.L.glow.push(`<path d="${sparkle(add(tip, [-R.side * u * 0.25 * i, u * 0.18 * i]), u * 0.07 * scale)}" fill="#FFF3C8" opacity="${r1(1 - i * 0.2)}"/>`);
      return;
    }
    case 'buoy': {
      const c = add(R.hand, [R.side * u * 0.1, u * 0.95 * scale]);
      const r = u * 0.32 * scale;
      b.L.front.push(`<path d="M${pt(R.hand)}L${r1(c[0])} ${r1(c[1] - r)}" stroke="#8C8FA0" stroke-width="${r1(u * 0.035)}" stroke-dasharray="${r1(u * 0.05)} ${r1(u * 0.025)}"/>`);
      b.L.glow.push(glowAt(c, r * 2.4, a));
      b.L.front.push(s.flat(ellipse(c, r, r), mix(a, '#FFF6E0', 0.45), lw));
      for (const t of [-0.55, 0, 0.55]) b.L.front.push(`<path d="M${r1(c[0] + t * r)} ${r1(c[1] - r * 0.92)}Q${r1(c[0] + t * r * 1.5)} ${r1(c[1])} ${r1(c[0] + t * r)} ${r1(c[1] + r * 0.92)}" fill="none" stroke="${INK}" stroke-width="${r1(lw * 0.7)}"/>`);
      b.L.front.push(s.flat(`M${r1(c[0] - r * 0.4)} ${r1(c[1] - r * 1.08)}h${r1(r * 0.8)}v${r1(r * 0.2)}h${r1(-r * 0.8)}Z`, '#5E6070', lw * 0.8));
      return;
    }
    case 'compass': {
      const c = add(R.hand, [0, -u * 0.12]);
      const r = u * 0.26 * scale;
      b.L.front.push(s.flat(ellipse(c, r, r), a, lw));
      b.L.front.push(s.flat(ellipse(c, r * 0.76, r * 0.76), '#FFF4D2', lw * 0.8));
      b.L.front.push(s.ink(`M${r1(c[0])} ${r1(c[1] - r * 0.66)}L${r1(c[0] + r * 0.14)} ${r1(c[1])}L${r1(c[0])} ${r1(c[1] + r * 0.66)}L${r1(c[0] - r * 0.14)} ${r1(c[1])}Z`, '#C8322C'));
      b.L.front.push(`<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.08)}" fill="${INK}"/>`);
      const L = b.left;
      const roll = add(L.elbow, [L.side * u * 0.05, u * 0.05]);
      b.L.arms.push(s.flat(tube([add(roll, [-L.side * u * 0.22, -u * 0.12]), add(roll, [L.side * u * 0.2, u * 0.06])], [u * 0.11, u * 0.11], false), '#EFE2BE', lw));
      b.L.arms.push(s.ink(brush([add(roll, [-L.side * u * 0.05, -u * 0.08]), add(roll, [L.side * u * 0.02, u * 0.0])], u * 0.02, { in: 0, out: 0 }), '#C8322C'));
      return;
    }
    case 'wire': {
      const tip = inside(add(R.hand, mul(R.dir, u * 0.85 * scale)), u * 0.5 * scale);
      const pts: P[] = [];
      for (let i = 0; i <= 6; i++) {
        const q = lerp(R.hand, tip, i / 6);
        pts.push(add(q, mul(perp(R.dir), (i % 2 ? 1 : -1) * u * 0.04)));
      }
      b.L.front.push(`<path d="M${pts.map(pt).join('L')}" fill="none" stroke="${INK}" stroke-width="${r1(u * 0.06)}" stroke-linejoin="round"/><path d="M${pts.map(pt).join('L')}" fill="none" stroke="${a}" stroke-width="${r1(u * 0.025)}" stroke-linejoin="round"/>`);
      b.L.glow.push(glowAt(tip, u * 0.6 * scale, a));
      b.L.front.push(`<path d="${sparkle(tip, u * 0.24 * scale, 0.2)}" fill="${a}" stroke="${INK}" stroke-width="${r1(lw * 0.6)}"/>`);
      const zig: P[] = [add(tip, [R.side * u * 0.2, -u * 0.1]), add(tip, [R.side * u * 0.35, u * 0.05]), add(tip, [R.side * u * 0.45, -u * 0.12]), add(tip, [R.side * u * 0.62, u * 0.02])];
      b.L.glow.push(`<path d="M${zig.map(pt).join('L')}" fill="none" stroke="${a}" stroke-width="${r1(u * 0.03)}" stroke-linejoin="round"/>`);
      return;
    }
    case 'trowel': {
      const base = add(R.hand, mul(R.dir, u * 0.12));
      const tip = add(base, mul(unit(add(R.dir, [R.side * 0.3, 0])), u * 0.9 * scale));
      const nrm = unit(perp(sub(tip, base)));
      const w = u * 0.3 * scale;
      b.L.front.push(s.flat(`M${pt(add(base, mul(nrm, w * 0.2)))}L${pt(add(lerp(base, tip, 0.3), mul(nrm, w)))}L${pt(tip)}L${pt(sub(lerp(base, tip, 0.3), mul(nrm, w)))}L${pt(sub(base, mul(nrm, w * 0.2)))}Z`, metal, lw));
      b.L.front.push(s.tone(`M${pt(base)}L${pt(add(lerp(base, tip, 0.3), mul(nrm, w)))}L${pt(tip)}Z`, 'hatch', 0.6));
      b.L.front.push(s.flat(tube([sub(R.hand, mul(R.dir, u * 0.2)), base], [u * 0.12, u * 0.1]), '#8A5A32', lw));
      return;
    }
    case 'chochin': {
      const pole = inside(add(R.hand, [R.side * u * 0.9 * scale, -u * 1.6 * scale]), u * 0.5 * scale);
      const back = sub(R.hand, mul(unit(sub(pole, R.hand)), u * 0.4));
      b.L.front.push(s.flat(tube([back, pole], [u * 0.06, u * 0.05], false), '#8A7A52', lw * 0.8));
      const c = add(pole, [R.side * u * 0.1, u * 0.75 * scale]);
      const w = u * 0.34 * scale;
      const h = u * 0.55 * scale;
      b.L.front.push(`<path d="M${pt(pole)}L${r1(c[0])} ${r1(c[1] - h * 0.55)}" stroke="${INK}" stroke-width="${r1(lw * 0.7)}"/>`);
      b.L.glow.push(glowAt(c, h * 1.8, '#F2A05A'));
      b.L.front.push(s.flat(`M${r1(c[0] - w * 0.55)} ${r1(c[1] - h * 0.42)}Q${r1(c[0] - w * 1.05)} ${r1(c[1])} ${r1(c[0] - w * 0.55)} ${r1(c[1] + h * 0.42)}H${r1(c[0] + w * 0.55)}Q${r1(c[0] + w * 1.05)} ${r1(c[1])} ${r1(c[0] + w * 0.55)} ${r1(c[1] - h * 0.42)}Z`, '#F6E2B8', lw));
      for (let i = -2; i <= 2; i++) b.L.front.push(`<path d="M${r1(c[0] - w * 0.9 + Math.abs(i) * w * 0.12)} ${r1(c[1] + (i * h) / 5.5)}H${r1(c[0] + w * 0.9 - Math.abs(i) * w * 0.12)}" stroke="${INK}" stroke-width="${r1(lw * 0.5)}" opacity=".6"/>`);
      b.L.front.push(`<path d="${sparkle(c, w * 0.34, 0.25)}" fill="#C8322C" opacity=".85"/>`);
      b.L.front.push(s.flat(`M${r1(c[0] - w * 0.45)} ${r1(c[1] - h * 0.55)}h${r1(w * 0.9)}v${r1(h * 0.14)}h${r1(-w * 0.9)}ZM${r1(c[0] - w * 0.45)} ${r1(c[1] + h * 0.42)}h${r1(w * 0.9)}v${r1(h * 0.14)}h${r1(-w * 0.9)}Z`, '#2A2230', lw * 0.8));
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Outfits, one per tradition
// ---------------------------------------------------------------------------

function cape(b: B, color: string, lining: string): void {
  const { sk } = b;
  const { u } = sk;
  const d = smooth([[CX - sk.shW * 0.9, sk.sh], [CX - sk.shW * 1.6, sk.knee], [CX - sk.shW * 1.9, sk.foot - 0.1 * u], [CX, sk.foot - 0.35 * u], [CX + sk.shW * 1.9, sk.foot - 0.1 * u], [CX + sk.shW * 1.6, sk.knee], [CX + sk.shW * 0.9, sk.sh]], false) + 'Z';
  b.L.back.push(shaded(b, d, lining, 0.12));
  b.L.back.push(b.s.castShadow(smooth([[CX - sk.shW * 0.95, sk.sh], [CX - sk.shW * 1.4, sk.knee], [CX - sk.shW * 1.6, sk.foot - 0.3 * u], [CX + sk.shW * 1.6, sk.foot - 0.3 * u], [CX + sk.shW * 1.4, sk.knee], [CX + sk.shW * 0.95, sk.sh]], false) + 'Z', color));
}

function coatPanels(b: B, color: string, hem: number, open: number): void {
  const { sk } = b;
  const { u } = sk;
  for (const side of [-1, 1] as const) {
    const pts: P[] = [
      [CX + side * sk.neckW * 0.45, sk.sh - 0.06 * u],
      [CX + side * sk.shW * 0.95, sk.sh + 0.1 * u],
      [CX + side * sk.shW * 0.9, sk.chest],
      [CX + side * sk.waistW * 1.05, sk.waist],
      [CX + side * sk.hipW * 1.35, hem],
      [CX + side * open * 1.4, hem + 0.05 * u],
      [CX + side * open, sk.waist],
      [CX + side * sk.neckW * 0.2, sk.chest - 0.1 * u],
    ];
    b.L.over.push(shaded(b, smooth(pts, true, 0.7), color, 0.1));
    b.L.over.push(folds(b, [[[CX + side * sk.waistW * 0.9, sk.waist + 0.2 * u], [CX + side * sk.hipW * 1.1, hem - 0.3 * u]], [[CX + side * (open + sk.waistW * 0.4), sk.waist + 0.4 * u], [CX + side * (open * 1.3 + sk.waistW * 0.3), hem - 0.1 * u]]]));
  }
}

function scarf(b: B, color: string): void {
  const { sk } = b;
  const { u } = sk;
  const wrap = smooth([[CX - sk.neckW * 0.95, sk.sh - 0.1 * u], [CX, sk.sh - 0.15 * u], [CX + sk.neckW * 0.95, sk.sh - 0.1 * u], [CX + sk.neckW * 1.05, sk.sh + 0.12 * u], [CX, sk.sh + 0.2 * u], [CX - sk.neckW * 1.05, sk.sh + 0.12 * u]], true);
  const tail1 = tube([[CX - sk.neckW * 0.6, sk.sh], [CX - sk.shW * 1.3, sk.sh + 0.2 * u], [CX - sk.shW * 2.1, sk.sh - 0.1 * u], [CX - sk.shW * 2.6, sk.sh + 0.2 * u]], [0.3 * u, 0.32 * u, 0.28 * u, 0.2 * u]);
  const tail2 = tube([[CX - sk.neckW * 0.5, sk.sh + 0.1 * u], [CX - sk.shW * 1.1, sk.sh + 0.5 * u], [CX - sk.shW * 1.8, sk.sh + 0.5 * u], [CX - sk.shW * 2.2, sk.sh + 0.8 * u]], [0.26 * u, 0.28 * u, 0.24 * u, 0.16 * u]);
  b.L.back.push(shaded(b, tail2, shade(color, -0.12), 0.06));
  b.L.back.push(shaded(b, tail1, color, 0.06));
  b.L.over.push(shaded(b, wrap, color, 0.06));
  b.L.over.push(folds(b, [[[CX - sk.neckW * 0.6, sk.sh - 0.05 * u], [CX + sk.neckW * 0.5, sk.sh - 0.01 * u]], [[CX - sk.neckW * 0.7, sk.sh + 0.08 * u], [CX + sk.neckW * 0.6, sk.sh + 0.11 * u]]]));
}

function outfit(b: B): void {
  const { sk, look, s } = b;
  const { u } = sk;
  const o = look.outfit;
  const un = look.under;
  const a = look.accent;
  const R = b.right;
  const Lf = b.left;
  const skin = look.skin;
  const glove = has(b, 'gloves') ? '#2A2230' : skin;

  switch (b.spec.eye) {
    case 'shonen': {
      b.L.legs.push(legs(b, { pants: '#2F2A3A', boots: '#3A2A22', bootTop: 0.45 }));
      b.L.torso.push(shaded(b, torsoPath(sk), un));
      b.L.torso.push(folds(b, [[[CX - sk.waistW * 0.4, sk.chest + 0.2 * u], [CX - sk.waistW * 0.1, sk.waist]], [[CX + sk.waistW * 0.3, sk.chest + 0.4 * u], [CX + sk.waistW * 0.5, sk.waist - 0.1 * u]]]));
      b.L.torso.push(s.flat(`M${r1(CX - sk.waistW * 1.02)} ${r1(sk.waist + 0.1 * u)}H${r1(CX + sk.waistW * 1.02)}V${r1(sk.waist + 0.28 * u)}H${r1(CX - sk.waistW * 1.02)}Z`, '#4A3426', b.line));
      b.L.torso.push(s.flat(`M${r1(CX - 0.1 * u)} ${r1(sk.waist + 0.08 * u)}h${r1(0.2 * u)}v${r1(0.22 * u)}h${r1(-0.2 * u)}Z`, '#C9A452', b.line * 0.8));
      coatPanels(b, o, sk.waist + 0.2 * u, sk.waistW * 0.45);
      scarf(b, a);
      b.L.arms.push(sleeve(b, R, o, { cuff: shade(o, -0.2) }) + hand(b, R, true, glove));
      b.L.arms.push(sleeve(b, Lf, o, { cuff: shade(o, -0.2) }) + hand(b, Lf, true, glove));
      return;
    }
    case 'rival': {
      b.L.legs.push(legs(b, { pants: shade(o, -0.1), boots: '#1A1624', bootTop: 0.2 }));
      const coatBack = smooth([[CX - sk.shW * 0.9, sk.sh], [CX - sk.hipW * 1.5, sk.foot - 0.25 * u], [CX + sk.hipW * 1.5, sk.foot - 0.25 * u], [CX + sk.shW * 0.9, sk.sh]], false) + 'Z';
      b.L.back.push(shaded(b, coatBack, shade(o, -0.15), 0.1));
      b.L.torso.push(shaded(b, torsoPath(sk), un));
      coatPanels(b, o, sk.foot - 0.3 * u, sk.waistW * 0.25);
      b.L.over.push(s.flat(`M${r1(CX - sk.neckW * 0.62)} ${r1(sk.sh - 0.28 * u)}L${r1(CX + sk.neckW * 0.62)} ${r1(sk.sh - 0.28 * u)}L${r1(CX + sk.neckW * 0.7)} ${r1(sk.sh + 0.08 * u)}L${r1(CX - sk.neckW * 0.7)} ${r1(sk.sh + 0.08 * u)}Z`, shade(o, 0.08), b.line));
      b.L.over.push(s.flat(`M${r1(CX - sk.waistW * 1.02)} ${r1(sk.waist - 0.02 * u)}H${r1(CX + sk.waistW * 1.02)}V${r1(sk.waist + 0.12 * u)}H${r1(CX - sk.waistW * 1.02)}Z`, a, b.line));
      b.L.arms.push(sleeve(b, R, o, { cuff: a }) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, o, { cuff: a }) + hand(b, Lf, true));
      return;
    }
    case 'sanpaku': {
      // Draped coat: worn on the shoulders like a cape, sleeves hanging empty.
      const drape = smooth([[CX - sk.neckW * 0.5, sk.sh - 0.1 * u], [CX - sk.shW * 1.18, sk.sh + 0.06 * u], [CX - sk.shW * 1.35, sk.knee - 0.2 * u], [CX - sk.shW * 1.1, sk.knee + 0.2 * u], [CX + sk.shW * 1.1, sk.knee + 0.2 * u], [CX + sk.shW * 1.35, sk.knee - 0.2 * u], [CX + sk.shW * 1.18, sk.sh + 0.06 * u], [CX + sk.neckW * 0.5, sk.sh - 0.1 * u]], false) + 'Z';
      b.L.back.push(shaded(b, drape, o, 0.12));
      for (const side of [-1, 1] as const) {
        b.L.back.push(shaded(b, tube([[CX + side * sk.shW * 1.12, sk.sh + 0.2 * u], [CX + side * sk.shW * 1.3, sk.waist], [CX + side * sk.shW * 1.25, sk.hip + 0.2 * u]], [sk.thigh * 0.62, sk.thigh * 0.58, sk.thigh * 0.55], false), shade(o, -0.1), 0.06));
        // Embroidered sigils down the coat, in gold.
        for (let i = 0; i < 3; i++) b.L.back.push(`<path d="${sparkle([CX + side * sk.shW * 1.18, sk.chest + i * 0.5 * u], 0.1 * u, 0.25)}" fill="${a}" opacity=".85"/>`);
      }
      b.L.legs.push(legs(b, { pants: un, boots: '#1C1A22', bootTop: 0.3 }));
      const skirt = smooth([[CX - sk.waistW, sk.waist], [CX - sk.hipW * 1.1, sk.hip], [CX - sk.hipW * 1.35, sk.foot - 0.3 * u], [CX + sk.hipW * 1.35, sk.foot - 0.3 * u], [CX + sk.hipW * 1.1, sk.hip], [CX + sk.waistW, sk.waist]], false) + 'Z';
      b.L.torso.push(shaded(b, torsoPath(sk), un));
      b.L.over.push(shaded(b, skirt, un, 0.1));
      b.L.over.push(folds(b, [-0.6, -0.2, 0.2, 0.6].map((t) => [[CX + t * sk.hipW, sk.hip], [CX + t * sk.hipW * 1.3, sk.foot - 0.35 * u]] as P[])));
      b.L.over.push(s.flat(`M${r1(CX - sk.neckW * 0.5)} ${r1(sk.sh - 0.08 * u)}L${r1(CX)} ${r1(sk.chest)}L${r1(CX + sk.neckW * 0.5)} ${r1(sk.sh - 0.08 * u)}Z`, '#E9E2D2', b.line));
      b.L.over.push(s.flat(`M${r1(CX - sk.waistW * 1.02)} ${r1(sk.waist - 0.08 * u)}H${r1(CX + sk.waistW * 1.02)}V${r1(sk.waist + 0.08 * u)}H${r1(CX - sk.waistW * 1.02)}Z`, '#C8322C', b.line));
      b.L.arms.push(sleeve(b, R, un, { cuff: '#E9E2D2' }) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, un, { cuff: '#E9E2D2' }) + hand(b, Lf, false));
      return;
    }
    case 'almond': {
      b.L.legs.push(legs(b, { pants: shade(o, 0.05), boots: '#1A1F2A', bootTop: 0.25 }));
      b.L.legs.push(folds(b, [[[CX - sk.hipW * 0.6, sk.knee + 0.3 * u], [CX - sk.hipW * 0.4, sk.knee + 0.4 * u]], [[CX + sk.hipW * 0.6, sk.knee + 0.3 * u], [CX + sk.hipW * 0.4, sk.knee + 0.4 * u]]], 0.02, 0.8));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.05, sk.hip + 0.3 * u), o));
      b.L.torso.push(s.flat(`M${r1(CX - sk.neckW * 0.2)} ${r1(sk.sh - 0.05 * u)}L${r1(CX + sk.waistW * 0.6)} ${r1(sk.waist)}L${r1(CX + sk.waistW * 0.4)} ${r1(sk.waist)}L${r1(CX - sk.neckW * 0.4)} ${r1(sk.sh + 0.1 * u)}Z`, un, b.line * 0.8));
      b.L.over.push(shaded(b, `M${r1(CX - sk.waistW * 1.05)} ${r1(sk.waist - 0.02 * u)}H${r1(CX + sk.waistW * 1.05)}V${r1(sk.waist + 0.16 * u)}H${r1(CX - sk.waistW * 1.05)}Z`, a, 0.02));
      b.L.over.push(shaded(b, tube([[CX + sk.waistW, sk.waist + 0.1 * u], [CX + sk.waistW * 1.5, sk.hip], [CX + sk.waistW * 1.4, sk.hip + 0.5 * u]], [0.14 * u, 0.12 * u, 0.02 * u]), a, 0.02));
      for (const A of [R, Lf]) {
        let arm = sleeve(b, A, o);
        for (let i = 0; i < 4; i++) arm += b.s.ink(brush([add(lerp(A.elbow, A.hand, 0.2 + i * 0.18), mul(perp(A.dir), sk.thigh * 0.28)), add(lerp(A.elbow, A.hand, 0.26 + i * 0.18), mul(perp(A.dir), -sk.thigh * 0.28))], 0.012 * u, { in: 0, out: 0 }), un, 0.9);
        b.L.arms.push(arm + hand(b, A, A === R ? false : true));
      }
      return;
    }
    case 'bishonen': {
      cape(b, shade(a, -0.35), a);
      b.L.legs.push(legs(b, { pants: '#3A3044', boots: o, bootTop: 0.05 }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.1, sk.hip + 0.2 * u), shade(o, -0.08)));
      const plate = smooth([[CX - sk.shW * 0.75, sk.sh + 0.05 * u], [CX, sk.sh - 0.02 * u], [CX + sk.shW * 0.75, sk.sh + 0.05 * u], [CX + sk.waistW * 1.05, sk.waist], [CX, sk.waist + 0.2 * u], [CX - sk.waistW * 1.05, sk.waist]], true);
      b.L.over.push(shaded(b, plate, o, 0.1));
      b.L.over.push(s.ink(brush([[CX, sk.sh + 0.05 * u], [CX, sk.waist + 0.1 * u]], 0.02 * u, { in: 0.2, out: 0.2 }), INK, 0.5));
      b.L.over.push(s.ink(brush([[CX - sk.shW * 0.7, sk.sh + 0.12 * u], [CX, sk.sh + 0.05 * u], [CX + sk.shW * 0.7, sk.sh + 0.12 * u]], 0.05 * u, { in: 0.2, out: 0.2 }), look.under, 0.95));
      b.L.over.push(`<path d="${sparkle([CX, sk.chest + 0.1 * u], 0.16 * u, 0.2)}" fill="${a}" stroke="${INK}" stroke-width="${r1(b.line * 0.6)}"/>`);
      for (const side of [-1, 1] as const) {
        for (let i = 0; i < 3; i++) {
          const tasset = `M${r1(CX + side * (sk.waistW * 0.2 + i * sk.waistW * 0.3))} ${r1(sk.waist + 0.15 * u)}l${r1(side * sk.waistW * 0.35)} 0l${r1(side * 0.05 * u)} ${r1(0.7 * u)}l${r1(-side * sk.waistW * 0.38)} ${r1(0.05 * u)}Z`;
          b.L.over.push(shaded(b, tasset, i % 2 ? o : shade(o, -0.06), 0.03));
        }
      }
      for (const A of [R, Lf]) {
        const pauldron = smooth([add(A.shoulder, [-A.side * sk.thigh * 0.4, -0.12 * u]), add(A.shoulder, [A.side * sk.thigh * 0.5, -0.1 * u]), add(A.shoulder, [A.side * sk.thigh * 0.7, 0.2 * u]), add(A.shoulder, [0, 0.32 * u]), add(A.shoulder, [-A.side * sk.thigh * 0.4, 0.15 * u])], true);
        b.L.arms.push(sleeve(b, A, '#3A3044', { gauntlet: o }) + hand(b, A, true, o) + shaded(b, pauldron, o, 0.06) + b.s.ink(brush([add(A.shoulder, [-A.side * sk.thigh * 0.2, 0.05 * u]), add(A.shoulder, [A.side * sk.thigh * 0.5, 0.12 * u])], 0.03 * u, { in: 0.2, out: 0.3 }), look.under));
      }
      return;
    }
    case 'chibi': {
      b.L.legs.push(legs(b, { pants: o, boots: '#4A3226' }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.05, sk.hip + 0.05 * u), un));
      const bib = `M${r1(CX - sk.waistW * 0.7)} ${r1(sk.chest - 0.05 * u)}H${r1(CX + sk.waistW * 0.7)}L${r1(CX + sk.waistW * 0.95)} ${r1(sk.waist)}L${r1(CX + sk.hipW * 1.02)} ${r1(sk.hip + 0.08 * u)}H${r1(CX - sk.hipW * 1.02)}L${r1(CX - sk.waistW * 0.95)} ${r1(sk.waist)}Z`;
      b.L.over.push(shaded(b, bib, o, 0.06));
      b.L.over.push(s.flat(`M${r1(CX - sk.waistW * 0.35)} ${r1(sk.chest + 0.02 * u)}h${r1(sk.waistW * 0.7)}v${r1(0.14 * u)}h${r1(-sk.waistW * 0.7)}Z`, shade(o, 0.1), b.line * 0.8));
      for (const side of [-1, 1] as const) b.L.over.push(`<circle cx="${r1(CX + side * sk.waistW * 0.55)}" cy="${r1(sk.chest - 0.02 * u)}" r="${r1(0.04 * u)}" fill="${a}" stroke="${INK}" stroke-width="${r1(b.line * 0.7)}"/>`);
      b.L.arms.push(sleeve(b, R, un) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, un) + hand(b, Lf, false));
      return;
    }
    case 'seinen': {
      b.L.legs.push(legs(b, { pants: shade(un, -0.2), boots: '#1C1E24', bootTop: 0.05 }));
      const cloakBack = smooth([[CX - sk.shW * 1.05, sk.sh], [CX - sk.shW * 1.45, sk.knee], [CX - sk.shW * 1.3, sk.foot - 0.35 * u], [CX + sk.shW * 1.3, sk.foot - 0.35 * u], [CX + sk.shW * 1.45, sk.knee], [CX + sk.shW * 1.05, sk.sh]], false) + 'Z';
      b.L.back.push(shaded(b, cloakBack, shade(o, -0.2), 0.12));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.05, sk.hip + 0.4 * u), un));
      b.L.torso.push(s.flat(`M${r1(CX - sk.waistW * 1.02)} ${r1(sk.waist)}H${r1(CX + sk.waistW * 1.02)}V${r1(sk.waist + 0.14 * u)}H${r1(CX - sk.waistW * 1.02)}Z`, '#3A2A22', b.line));
      for (const side of [-1, 1] as const) {
        const panel = smooth([[CX + side * sk.neckW * 0.6, sk.sh - 0.1 * u], [CX + side * sk.shW * 1.12, sk.sh + 0.1 * u], [CX + side * sk.shW * 1.3, sk.waist], [CX + side * sk.shW * 1.2, sk.foot - 0.4 * u], [CX + side * sk.waistW * 0.55, sk.foot - 0.35 * u], [CX + side * sk.waistW * 0.5, sk.waist], [CX + side * sk.neckW * 0.3, sk.chest]], true, 0.8);
        b.L.over.push(shaded(b, panel, o, 0.12));
        b.L.over.push(folds(b, [[[CX + side * sk.shW * 0.9, sk.chest], [CX + side * sk.shW * 1.05, sk.knee]], [[CX + side * sk.waistW * 0.9, sk.waist + 0.3 * u], [CX + side * sk.waistW * 0.8, sk.knee + 0.4 * u]]], 0.014));
      }
      const collar = smooth([[CX - sk.shW * 0.95, sk.sh + 0.05 * u], [CX - sk.neckW * 0.7, sk.sh - 0.3 * u], [CX, sk.sh - 0.2 * u], [CX + sk.neckW * 0.7, sk.sh - 0.3 * u], [CX + sk.shW * 0.95, sk.sh + 0.05 * u], [CX, sk.sh + 0.25 * u]], true);
      b.L.over.push(shaded(b, collar, shade(o, 0.12), 0.05));
      b.L.arms.push(sleeve(b, R, shade(o, 0.05), { cuff: shade(o, -0.1) }) + hand(b, R, true, '#3A3230'));
      b.L.arms.push(sleeve(b, Lf, shade(o, 0.05), { cuff: shade(o, -0.1) }) + hand(b, Lf, true, '#3A3230'));
      return;
    }
    case 'showa': {
      b.L.legs.push(legs(b, { pants: un, boots: '#5A3A24', bootTop: 0.55, socks: PAPER }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.05, sk.hip + 0.1 * u), o));
      b.L.torso.push(s.flat(`M${r1(CX - sk.neckW * 0.55)} ${r1(sk.sh - 0.08 * u)}L${r1(CX)} ${r1(sk.sh + 0.3 * u)}L${r1(CX + sk.neckW * 0.55)} ${r1(sk.sh - 0.08 * u)}Z`, un, b.line));
      for (const side of [-1, 1] as const) b.L.torso.push(s.flat(`M${r1(CX + side * sk.waistW * 0.3)} ${r1(sk.chest + 0.1 * u)}h${r1(side * sk.waistW * 0.5)}v${r1(0.3 * u)}h${r1(-side * sk.waistW * 0.5)}Z`, shade(o, 0.1), b.line));
      b.L.over.push(s.flat(`M${r1(CX - sk.waistW * 1.05)} ${r1(sk.waist + 0.05 * u)}H${r1(CX + sk.waistW * 1.05)}V${r1(sk.waist + 0.2 * u)}H${r1(CX - sk.waistW * 1.05)}Z`, '#5A3A24', b.line));
      b.L.arms.push(sleeve(b, R, o, { cuff: un }) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, o, { cuff: un }) + hand(b, Lf, true));
      if (has(b, 'satchel')) {
        b.L.over.push(s.flat(tube([[CX + sk.shW * 0.6, sk.sh], [CX - sk.hipW * 0.9, sk.hip - 0.1 * u]], [0.08 * u, 0.08 * u], false), '#6A4428', b.line));
        b.L.over.push(shaded(b, `M${r1(CX - sk.hipW * 1.3)} ${r1(sk.hip - 0.3 * u)}h${r1(sk.hipW * 0.8)}v${r1(0.5 * u)}h${r1(-sk.hipW * 0.8)}Z`, '#8A5A32', 0.05));
      }
      return;
    }
    case 'shoujo': {
      cape(b, shade(o, -0.3), un);
      b.L.legs.push(legs(b, { pants: '#F2ECDD', boots: '#241C22', bootTop: 0.0 }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.1, sk.hip + 0.45 * u), o));
      b.L.torso.push(folds(b, [[[CX - sk.waistW * 0.8, sk.waist + 0.2 * u], [CX - sk.hipW * 1.0, sk.hip + 0.4 * u]], [[CX + sk.waistW * 0.8, sk.waist + 0.2 * u], [CX + sk.hipW * 1.0, sk.hip + 0.4 * u]]]));
      for (let i = 0; i < 4; i++) b.L.torso.push(`<circle cx="${r1(CX - 0.06 * u)}" cy="${r1(sk.chest - 0.1 * u + i * 0.28 * u)}" r="${r1(0.035 * u)}" fill="#D9A441" stroke="${INK}" stroke-width="${r1(b.line * 0.5)}"/>`);
      b.L.over.push(shaded(b, tube([[CX + sk.shW * 0.8, sk.sh + 0.05 * u], [CX, sk.chest + 0.4 * u], [CX - sk.waistW, sk.waist + 0.1 * u]], [0.2 * u, 0.24 * u, 0.2 * u], false), un, 0.04));
      b.L.over.push(s.flat(`M${r1(CX - sk.neckW * 0.6)} ${r1(sk.sh - 0.22 * u)}L${r1(CX + sk.neckW * 0.6)} ${r1(sk.sh - 0.22 * u)}L${r1(CX + sk.neckW * 0.7)} ${r1(sk.sh + 0.06 * u)}L${r1(CX - sk.neckW * 0.7)} ${r1(sk.sh + 0.06 * u)}Z`, shade(o, -0.05), b.line));
      for (const A of [R, Lf]) {
        let arm = sleeve(b, A, o, { cuff: un }) + hand(b, A, A === R ? true : false, PAPER);
        // Epaulettes with a gold fringe.
        const ep = ellipse(add(A.shoulder, [A.side * 0.02 * u, -0.04 * u]), sk.thigh * 0.46, 0.09 * u);
        for (let i = -3; i <= 3; i++) arm += b.s.ink(brush([add(A.shoulder, [i * sk.thigh * 0.12, 0.0]), add(A.shoulder, [i * sk.thigh * 0.13, 0.18 * u])], 0.018 * u, { in: 0, out: 0.5 }), '#D9A441');
        arm += shaded(b, ep, '#D9A441', 0.02);
        b.L.arms.push(arm);
      }
      return;
    }
    case 'gekiga': {
      b.L.legs.push(legs(b, { pants: '#2E2A30', boots: '#241E1C', bootTop: 0.4 }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.02, sk.hip + 0.05 * u), un));
      b.L.torso.push(folds(b, [[[CX - sk.shW * 0.5, sk.chest], [CX - sk.waistW * 0.3, sk.chest + 0.3 * u]], [[CX + sk.shW * 0.5, sk.chest], [CX + sk.waistW * 0.3, sk.chest + 0.3 * u]]], 0.016));
      const apron = `M${r1(CX - sk.waistW * 0.75)} ${r1(sk.chest - 0.1 * u)}H${r1(CX + sk.waistW * 0.75)}L${r1(CX + sk.hipW * 1.05)} ${r1(sk.waist + 0.1 * u)}L${r1(CX + sk.hipW * 1.1)} ${r1(sk.knee + 0.2 * u)}H${r1(CX - sk.hipW * 1.1)}L${r1(CX - sk.hipW * 1.05)} ${r1(sk.waist + 0.1 * u)}Z`;
      b.L.over.push(shaded(b, apron, o, 0.1));
      b.L.over.push(s.flat(`M${r1(CX - sk.hipW * 0.5)} ${r1(sk.hip)}h${r1(sk.hipW)}v${r1(0.5 * u)}h${r1(-sk.hipW)}Z`, shade(o, -0.1), b.line));
      for (const side of [-1, 1] as const) b.L.over.push(s.flat(tube([[CX + side * sk.waistW * 0.7, sk.chest - 0.08 * u], [CX + side * sk.shW * 0.55, sk.sh - 0.02 * u]], [0.1 * u, 0.1 * u], false), shade(o, -0.15), b.line));
      b.L.arms.push(sleeve(b, R, un, { rolled: true }) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, un, { rolled: true }) + hand(b, Lf, true));
      return;
    }
    case 'majokko': {
      b.L.legs.push(legs(b, { pants: '#2A2448', boots: '#1D1A3A', bootTop: 0.45, socks: '#EDE6F8' }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.0, sk.waist + 0.1 * u), o));
      const skirt = smooth([[CX - sk.waistW, sk.waist], [CX - sk.hipW * 1.6, sk.hip + 0.5 * u], [CX, sk.hip + 0.6 * u], [CX + sk.hipW * 1.6, sk.hip + 0.5 * u], [CX + sk.waistW, sk.waist]], false) + 'Z';
      let frill = `M${r1(CX - sk.hipW * 1.66)} ${r1(sk.hip + 0.45 * u)}`;
      for (let i = 0; i < 8; i++) frill += `Q${r1(CX - sk.hipW * 1.66 + (i + 0.5) * ((sk.hipW * 3.32) / 8))} ${r1(sk.hip + 0.85 * u)} ${r1(CX - sk.hipW * 1.66 + (i + 1) * ((sk.hipW * 3.32) / 8))} ${r1(sk.hip + 0.45 * u)}`;
      frill += 'Z';
      b.L.over.push(b.s.flat(frill, un, b.line));
      b.L.over.push(shaded(b, skirt, o, 0.1));
      b.L.over.push(folds(b, [-0.8, -0.3, 0.3, 0.8].map((t) => [[CX + t * sk.waistW, sk.waist + 0.1 * u], [CX + t * sk.hipW * 1.5, sk.hip + 0.45 * u]] as P[])));
      for (let i = 0; i < 3; i++) b.L.over.push(`<path d="${sparkle([CX + (i - 1) * sk.hipW * 0.9, sk.hip + 0.2 * u + (i % 2) * 0.15 * u], 0.07 * u)}" fill="${a}"/>`);
      const bowC: P = [CX, sk.sh + 0.1 * u];
      b.L.over.push(shaded(b, smooth([bowC, add(bowC, [-0.3 * u, -0.16 * u]), add(bowC, [-0.34 * u, 0.12 * u])], true), a, 0.02));
      b.L.over.push(shaded(b, smooth([bowC, add(bowC, [0.3 * u, -0.16 * u]), add(bowC, [0.34 * u, 0.12 * u])], true), a, 0.02));
      b.L.over.push(shaded(b, ellipse(bowC, 0.07 * u, 0.07 * u), shade(a, -0.2), 0.01));
      b.L.arms.push(sleeve(b, R, o, { puff: true, gauntlet: un }) + hand(b, R, true, PAPER));
      b.L.arms.push(sleeve(b, Lf, o, { puff: true, gauntlet: un }) + hand(b, Lf, false, PAPER));
      return;
    }
    case 'yokai': {
      b.L.legs.push(legs(b, { pants: un, wide: true, geta: true }));
      b.L.torso.push(shaded(b, torsoPath(sk, 1.05, sk.hip + 0.1 * u), shade(un, 0.15)));
      for (const side of [-1, 1] as const) {
        const panel = smooth([[CX + side * sk.neckW * 0.5, sk.sh - 0.08 * u], [CX + side * sk.shW * 1.02, sk.sh + 0.08 * u], [CX + side * sk.waistW * 1.2, sk.waist], [CX + side * sk.hipW * 1.3, sk.hip + 0.55 * u], [CX + side * sk.waistW * 0.35, sk.hip + 0.6 * u], [CX + side * sk.neckW * 0.2, sk.chest]], true, 0.8);
        b.L.over.push(shaded(b, panel, o, 0.1));
      }
      // A crest on the chest, in the lantern's colour.
      b.L.over.push(`<circle cx="${r1(CX + sk.waistW * 0.75)}" cy="${r1(sk.chest)}" r="${r1(0.07 * u)}" fill="none" stroke="${a}" stroke-width="${r1(0.02 * u)}"/>`);
      b.L.over.push(s.flat(`M${r1(CX - sk.waistW * 1.1)} ${r1(sk.waist)}H${r1(CX + sk.waistW * 1.1)}V${r1(sk.waist + 0.16 * u)}H${r1(CX - sk.waistW * 1.1)}Z`, '#3A2A3A', b.line));
      b.L.arms.push(sleeve(b, R, o, { wide: true, cuff: o }) + hand(b, R, true));
      b.L.arms.push(sleeve(b, Lf, o, { wide: true, cuff: o }));
      return;
    }
  }
}

export function body(s: Sheet, spec: StyleSpec, look: Look, sk: Skel): Layers {
  const L: Layers = { back: [], legs: [], torso: [], over: [], arms: [], front: [], glow: [] };
  const pose = POSES[look.prop];
  const b: B = { s, spec, look, sk, line: 1.5 * spec.line, L, right: arm(sk, 1, pose.right), left: arm(sk, -1, pose.left), wear: new Set(look.wear) };
  if (look.cape && spec.eye !== 'bishonen' && spec.eye !== 'shoujo') cape(b, shade(look.outfit, -0.3), look.accent);
  L.torso.push(neck(b));
  outfit(b);
  prop(b);
  return L;
}

