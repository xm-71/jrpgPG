import type { Look, Mood } from '@duskline/core';
import { mix, shade } from '../color';
import { type P, add, brush, ellipse, flipX, lerp, pt, r1, smooth, sparkle } from './geom';
import { BLUSH, INK, MOUTH, PAPER, SWEAT, TONGUE, type Sheet } from './ink';
import type { EyeKind, StyleSpec } from './styles';

/**
 * Heads and faces. Coordinates are head-local: the top of the skull at (0, 0), the chin at (0, u),
 * the face centred on x = 0. Everything that changes with mood lives here: eyes, brows, mouth and
 * the manga symbols (manpu) that go with a feeling.
 */

export interface FaceIn {
  s: Sheet;
  spec: StyleSpec;
  look: Look;
  mood: Mood;
  /** Head height in pixels. */
  u: number;
}

/** Styles that play a feeling for laughs (>< eyes, a popping vein) rather than straight. */
const COMIC = new Set<EyeKind>(['shonen', 'chibi', 'showa', 'majokko', 'sanpaku']);

// ---------------------------------------------------------------------------
// The head
// ---------------------------------------------------------------------------

export function headPath(spec: StyleSpec, u: number): string {
  const hw = (spec.headW * u) / 2;
  const ey = spec.eyeY * u;
  const jawX = hw * (0.62 + 0.3 * spec.jaw);
  const jawY = u * (0.78 + 0.04 * spec.jaw);
  const chinX = hw * (0.2 + 0.3 * spec.jaw) * (1 - 0.45 * spec.chin);
  const chinY = u * (0.955 - 0.02 * spec.chin);
  const right: P[] = [
    [chinX, chinY],
    [jawX, jawY],
    [hw * 0.985, ey + 0.04 * u],
    [hw, u * 0.3],
    [hw * 0.74, u * 0.06],
    [0, 0],
  ];
  const pts: P[] = [...right, ...right.slice(0, -1).reverse().map((p) => flipX(p))];
  const body = smooth(pts, false, 1).replace(/^M[^C]*/, '');
  const tip: P = [0, u];
  const round = 1 - spec.chin;
  const cR: P = [chinX * (0.35 + 0.6 * round), u - 0.004 * u];
  const cL = flipX(cR);
  return `M${pt(tip)}Q${pt(cR)} ${pt(right[0]!)}${body}Q${pt(cL)} ${pt(tip)}Z`;
}

export function ears(s: Sheet, spec: StyleSpec, look: Look, u: number): string {
  const hw = (spec.headW * u) / 2;
  const ey = spec.eyeY * u;
  const one = (): string => {
    const d = smooth(
      [
        [hw * 0.9, ey - 0.03 * u],
        [hw + 0.07 * u, ey - 0.02 * u],
        [hw + 0.08 * u, ey + 0.08 * u],
        [hw + 0.03 * u, ey + 0.17 * u],
        [hw * 0.88, ey + 0.16 * u],
      ],
      true,
    );
    const inner = brush(
      [
        [hw + 0.045 * u, ey + 0.01 * u],
        [hw + 0.02 * u, ey + 0.07 * u],
        [hw + 0.03 * u, ey + 0.12 * u],
      ],
      0.018 * u * spec.line,
    );
    return s.shaded(d, look.skin, { off: 0.03 * u, line: 1.3 * spec.line }) + s.ink(inner);
  };
  return `${one()}<g transform="scale(-1 1)">${one()}</g>`;
}

// ---------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------

interface EyeParams {
  arch: number;
  outer: number;
  inner: number;
  lid: number;
  flick: number;
  lashes: number;
  lower: number;
  iris: number;
  irisH: number;
  irisY: number;
  hl: 'two' | 'one' | 'shoujo' | 'star' | 'pie' | 'dot';
  crease: boolean;
  pupil: number;
  bags: boolean;
  ring: boolean;
}

const EYES: Record<EyeKind, EyeParams> = {
  shonen: { arch: 0.9, outer: -0.05, inner: 0.16, lid: 0.03, flick: 0.12, lashes: 0, lower: 0.45, iris: 0.34, irisH: 0.66, irisY: 0.08, hl: 'two', crease: false, pupil: 0.45, bags: false, ring: false },
  rival: { arch: 0.45, outer: -0.14, inner: 0.22, lid: 0.028, flick: 0.18, lashes: 1, lower: 0.35, iris: 0.31, irisH: 0.9, irisY: 0.02, hl: 'one', crease: true, pupil: 0.42, bags: false, ring: false },
  sanpaku: { arch: 0.62, outer: -0.2, inner: 0.24, lid: 0.032, flick: 0.1, lashes: 1, lower: 0.65, iris: 0.24, irisH: 0.52, irisY: -0.16, hl: 'dot', crease: false, pupil: 0.5, bags: false, ring: false },
  almond: { arch: 0.72, outer: -0.16, inner: 0.18, lid: 0.028, flick: 0.2, lashes: 1, lower: 0.5, iris: 0.33, irisH: 0.72, irisY: 0.02, hl: 'two', crease: false, pupil: 0.42, bags: false, ring: false },
  bishonen: { arch: 0.52, outer: -0.02, inner: 0.16, lid: 0.024, flick: 0.3, lashes: 2, lower: 0.55, iris: 0.3, irisH: 0.9, irisY: 0.04, hl: 'two', crease: true, pupil: 0.36, bags: false, ring: false },
  chibi: { arch: 1, outer: 0.02, inner: 0.06, lid: 0.036, flick: 0.06, lashes: 0, lower: 0.28, iris: 0.42, irisH: 0.8, irisY: 0.1, hl: 'two', crease: false, pupil: 0.48, bags: false, ring: false },
  seinen: { arch: 0.62, outer: -0.04, inner: 0.1, lid: 0.02, flick: 0, lashes: 0, lower: 0.72, iris: 0.22, irisH: 1, irisY: 0.02, hl: 'dot', crease: true, pupil: 0.5, bags: true, ring: false },
  showa: { arch: 1, outer: 0, inner: 0, lid: 0.03, flick: 0, lashes: 3, lower: 1, iris: 0.36, irisH: 0.7, irisY: 0.16, hl: 'pie', crease: false, pupil: 0, bags: false, ring: false },
  shoujo: { arch: 0.92, outer: -0.08, inner: 0.12, lid: 0.032, flick: 0.24, lashes: 4, lower: 0.62, iris: 0.39, irisH: 0.82, irisY: 0.06, hl: 'shoujo', crease: true, pupil: 0.3, bags: false, ring: false },
  gekiga: { arch: 0.45, outer: 0.02, inner: 0.14, lid: 0.024, flick: 0, lashes: 0, lower: 0.72, iris: 0.25, irisH: 1, irisY: 0.02, hl: 'dot', crease: true, pupil: 0.52, bags: true, ring: false },
  majokko: { arch: 0.96, outer: -0.05, inner: 0.1, lid: 0.032, flick: 0.16, lashes: 2, lower: 0.5, iris: 0.38, irisH: 0.8, irisY: 0.08, hl: 'star', crease: false, pupil: 0.34, bags: false, ring: false },
  yokai: { arch: 0.92, outer: 0.02, inner: 0.08, lid: 0.026, flick: 0, lashes: 0, lower: 0.9, iris: 0.2, irisH: 0.46, irisY: 0.06, hl: 'dot', crease: false, pupil: 0.62, bags: false, ring: true },
};

type EyeState = 'open' | 'fierce' | 'squint' | 'shut' | 'happy' | 'wide' | 'soft';

function eyeStates(mood: Mood, kind: EyeKind): [EyeState, EyeState] {
  const comic = COMIC.has(kind);
  switch (mood) {
    case 'calm':
      return ['open', 'open'];
    case 'fierce':
      return ['fierce', 'fierce'];
    case 'hurt':
      return comic ? ['squint', 'shut'] : ['squint', 'squint'];
    case 'smile':
      return comic || kind === 'shoujo' || kind === 'bishonen' || kind === 'almond' ? ['happy', 'happy'] : ['soft', 'soft'];
    case 'shock':
      return ['wide', 'wide'];
  }
}

/**
 * One eye, drawn in eye-local space: centred on (0, 0), outer corner toward +x. The left eye is
 * the same markup mirrored. W and H are the eye's width and height in pixels.
 */
function eye(s: Sheet, kind: EyeKind, look: Look, state: EyeState, W: number, H: number, u: number, line: number, shadowed: boolean): string {
  const e = EYES[kind];
  const lidW = e.lid * u * line;
  if (state === 'happy') {
    const arc: P[] = [
      [-W * 0.5, H * 0.18],
      [-W * 0.05, -H * 0.42],
      [W * 0.5, H * 0.12],
    ];
    let out = s.ink(brush(arc, lidW * 1.15, { in: 0.25, out: 0.3 }));
    if (e.lashes > 0) out += s.ink(brush([[W * 0.46, H * 0.08], [W * 0.62, -H * 0.02], [W * 0.72, -H * 0.12]], lidW * 0.7, { in: 0, out: 0.8 }));
    return out;
  }
  if (state === 'shut') {
    const v: P = [-W * 0.34, H * 0.04];
    return (
      s.ink(brush([[W * 0.46, -H * 0.36], [W * 0.05, -H * 0.12], v], lidW * 1.1, { in: 0.2, out: 0.1 })) +
      s.ink(brush([v, [W * 0.05, H * 0.22], [W * 0.42, H * 0.42]], lidW * 1.1, { in: 0.1, out: 0.3 }))
    );
  }

  let arch = e.arch;
  let inner = e.inner;
  let outer = e.outer;
  let lowerLift = 0;
  let irisScale = 1;
  let hl = e.hl;
  let pupil = e.pupil;
  if (state === 'fierce') {
    arch -= 0.42;
    inner += 0.24;
    outer -= 0.1;
    irisScale = 0.9;
  } else if (state === 'squint') {
    arch -= 0.62;
    inner += 0.12;
    lowerLift = 0.14;
  } else if (state === 'soft') {
    arch -= 0.22;
    lowerLift = 0.05;
  } else if (state === 'wide') {
    arch += 0.3;
    lowerLift = -0.12;
    irisScale = 0.42;
    hl = 'dot';
    pupil = 0.9;
  }

  const I: P = [-W * 0.5, inner * H];
  const Pk: P = [-W * 0.06, -arch * H * 0.62];
  const O: P = [W * 0.5, outer * H];
  const B1: P = [W * 0.22, H * (0.5 - lowerLift)];
  const B2: P = [-W * 0.26, H * (0.46 - lowerLift)];
  const Q1: P = lerp(I, Pk, 0.5);
  const Q2: P = [(Pk[0] + O[0]) / 2, (Pk[1] + O[1]) / 2 - H * 0.08];
  const scleraD = kind === 'showa' ? ellipse([0, 0.04 * H], W * 0.5, H * 0.52) : smooth([I, Q1, Pk, Q2, O, B1, B2], true, 0.9);
  const clip = s.uid('e');
  const irisC: P = [-W * 0.02, e.irisY * H + (state === 'fierce' ? H * 0.12 : 0)];
  const rx = e.iris * W * irisScale;
  const ry = e.irisH * H * 0.62 * (state === 'wide' ? 0.55 : 1) * (kind === 'showa' ? 1.05 : 1);
  const irisDark = shade(look.eyes, -0.55);
  const irisLight = shade(look.eyes, 0.4);
  const sclera = shadowed ? mix(PAPER, INK, 0.5) : PAPER;

  let iris = '';
  if (kind === 'showa') {
    // A big black iris with a white wedge of light: the classic round-eye look.
    iris += `<path d="${ellipse(irisC, rx, ry)}" fill="${INK}"/>`;
    if (state !== 'wide') {
      const c = add(irisC, [-rx * 0.25, -ry * 0.3]);
      iris += `<path d="M${pt(c)}L${pt(add(c, [-rx * 0.5, -ry * 0.25]))}A${r1(rx * 0.55)} ${r1(ry * 0.55)} 0 0 1 ${pt(add(c, [rx * 0.1, -ry * 0.55]))}Z" fill="${PAPER}"/>`;
      iris += `<circle cx="${r1(irisC[0] + rx * 0.4)}" cy="${r1(irisC[1] + ry * 0.35)}" r="${r1(rx * 0.12)}" fill="${PAPER}"/>`;
    }
  } else {
    iris += `<path d="${ellipse(irisC, rx, ry)}" fill="${look.eyes}"/>`;
    // Lids cast shade on the top of the iris; a lighter band sits at the bottom.
    iris += `<path d="${ellipse(add(irisC, [0, -ry * 0.45]), rx * 1.05, ry * 0.75)}" fill="${irisDark}" opacity=".85"/>`;
    iris += s.tone(ellipse(add(irisC, [0, -ry * 0.35]), rx * 1.05, ry * 0.8), 'dotS', 0.5);
    if (hl === 'shoujo' || hl === 'star' || kind === 'bishonen') iris += `<path d="${ellipse(add(irisC, [0, ry * 0.55]), rx * 0.72, ry * 0.3)}" fill="${irisLight}" opacity=".9"/>`;
    iris += `<path d="${ellipse(add(irisC, [0, ry * 0.05]), rx * pupil, ry * pupil * (state === 'wide' ? 0.9 : 0.95))}" fill="${INK}"/>`;
    iris += `<path d="${ellipse(irisC, rx, ry)}" fill="none" stroke="${INK}" stroke-width="${r1(0.012 * u * line)}"/>`;
    const hlc = PAPER;
    switch (hl) {
      case 'two':
        iris += `<path d="${ellipse(add(irisC, [-rx * 0.32, -ry * 0.34]), rx * 0.3, ry * 0.26)}" fill="${hlc}"/>`;
        iris += `<circle cx="${r1(irisC[0] + rx * 0.38)}" cy="${r1(irisC[1] + ry * 0.38)}" r="${r1(rx * 0.13)}" fill="${hlc}"/>`;
        break;
      case 'one':
        iris += `<path d="${ellipse(add(irisC, [-rx * 0.3, -ry * 0.18]), rx * 0.18, ry * 0.16)}" fill="${hlc}"/>`;
        break;
      case 'dot':
        if (state !== 'wide') iris += `<circle cx="${r1(irisC[0] - rx * 0.28)}" cy="${r1(irisC[1] - ry * 0.28)}" r="${r1(Math.max(0.6, rx * 0.2))}" fill="${hlc}"/>`;
        break;
      case 'shoujo':
        iris += `<path d="${ellipse(add(irisC, [-rx * 0.3, -ry * 0.36]), rx * 0.34, ry * 0.3)}" fill="${hlc}"/>`;
        iris += `<path d="${sparkle(add(irisC, [rx * 0.34, -ry * 0.1]), rx * 0.3, 0.14)}" fill="${hlc}"/>`;
        iris += `<circle cx="${r1(irisC[0] + rx * 0.05)}" cy="${r1(irisC[1] + ry * 0.5)}" r="${r1(rx * 0.1)}" fill="${hlc}"/>`;
        iris += `<circle cx="${r1(irisC[0] - rx * 0.45)}" cy="${r1(irisC[1] + ry * 0.3)}" r="${r1(rx * 0.07)}" fill="${hlc}"/>`;
        break;
      case 'star':
        iris += `<path d="${sparkle(add(irisC, [-rx * 0.22, -ry * 0.22]), rx * 0.44, 0.2)}" fill="${hlc}"/>`;
        iris += `<circle cx="${r1(irisC[0] + rx * 0.4)}" cy="${r1(irisC[1] + ry * 0.36)}" r="${r1(rx * 0.12)}" fill="${hlc}"/>`;
        break;
      case 'pie':
        break;
    }
  }

  let out = `<clipPath id="${clip}"><path d="${scleraD}"/></clipPath>`;
  out += `<path d="${scleraD}" fill="${sclera}"/>`;
  out += `<g clip-path="url(#${clip})">${iris}${kind !== 'showa' ? `<path d="${smooth([I, Q1, Pk, Q2, O], false)}L${r1(W)} ${r1(-H)}L${r1(-W)} ${r1(-H)}Z" fill="${INK}" opacity=".18" transform="translate(0 ${r1(H * 0.12)})"/>` : ''}</g>`;

  if (kind === 'showa') {
    out += `<path d="${scleraD}" fill="none" stroke="${INK}" stroke-width="${r1(lidW * 0.75)}"/>`;
    if (e.lashes > 0 && state !== 'wide') {
      for (let i = 0; i < e.lashes; i++) {
        const a = -0.2 - i * 0.28;
        const base: P = [W * 0.5 * Math.cos(a), 0.04 * H + H * 0.52 * Math.sin(a)];
        out += s.ink(brush([base, add(base, [W * 0.16, -H * 0.18 + i * H * 0.05])], lidW * 0.8, { in: 0, out: 0.9 }));
      }
    }
    return out;
  }

  // The lash line: heaviest at the outer corner, with a flick.
  const F: P = add(O, [e.flick * W, -e.flick * W * 0.35]);
  const lidPts: P[] = e.flick > 0 ? [I, Q1, Pk, Q2, O, F] : [I, Q1, Pk, Q2, O];
  out += s.ink(brush(lidPts, lidW, { in: 0.45, out: e.flick > 0 ? 0.3 : 0.15, min: 0.2 }));
  for (let i = 0; i < e.lashes; i++) {
    const t = 0.72 + i * 0.08;
    const base = lerp(Pk, O, Math.min(1, t));
    out += s.ink(brush([base, add(base, [W * (0.12 + i * 0.02), -H * (0.28 - i * 0.04)])], lidW * 0.55, { in: 0, out: 0.85 }));
  }
  if (e.crease && state !== 'wide') {
    out += s.ink(brush([add(Q1, [W * 0.05, -H * 0.22]), add(Pk, [0, -H * 0.24]), add(Q2, [0, -H * 0.2])], lidW * 0.32, { in: 0.4, out: 0.5 }));
  }
  if (e.lower > 0) {
    const l0 = lerp(B2, B1, 1 - e.lower);
    out += s.ink(brush([l0, lerp(l0, B1, 0.5), add(B1, [W * 0.12, -H * 0.12])], lidW * 0.35, { in: 0.5, out: 0.3 }));
  }
  if (e.bags && state !== 'wide') {
    out += s.ink(brush([add(B2, [W * 0.1, H * 0.35]), add(B1, [-W * 0.05, H * 0.42])], lidW * 0.25, { in: 0.5, out: 0.5 }), INK, 0.6);
  }
  if (e.ring) {
    out += s.ink(brush([add(B2, [0, H * 0.3]), add(lerp(B2, B1, 0.5), [0, H * 0.42]), add(B1, [W * 0.1, H * 0.25])], lidW * 0.4, { in: 0.4, out: 0.4 }), INK, 0.55);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Brows, nose, mouth
// ---------------------------------------------------------------------------

const BROW_W: Record<StyleSpec['brow'], number> = { thick: 0.036, thin: 0.015, sharp: 0.022, heavy: 0.05, natural: 0.024, arc: 0.024, stub: 0.034 };

function brow(s: Sheet, spec: StyleSpec, look: Look, mood: Mood, u: number, shadowed: boolean): string {
  const W = spec.eyeW * u;
  const H = spec.eyeH * u;
  const y0 = -H * 0.72 - 0.05 * u;
  let inY = 0;
  let outY = 0;
  let inX = 0;
  switch (mood) {
    case 'fierce':
      inY = 0.055 * u;
      outY = -0.015 * u;
      inX = 0.01 * u;
      break;
    case 'hurt':
      inY = -0.045 * u;
      outY = 0.02 * u;
      break;
    case 'smile':
      inY = -0.015 * u;
      outY = -0.015 * u;
      break;
    case 'shock':
      inY = -0.08 * u;
      outY = -0.05 * u;
      break;
  }
  const short = spec.brow === 'stub' ? 0.55 : spec.brow === 'arc' ? 0.85 : 1;
  const a: P = [-W * 0.42 + inX, y0 + inY + (spec.brow === 'sharp' ? 0.015 * u : 0)];
  const c: P = [W * 0.62 * short, y0 + outY - (spec.brow === 'arc' ? 0 : 0.01 * u)];
  const m: P = [(a[0] + c[0]) / 2, Math.min(a[1], c[1]) - (spec.brow === 'arc' ? 0.05 : spec.brow === 'sharp' ? 0.008 : 0.022) * u];
  const col = spec.brow === 'heavy' || spec.brow === 'natural' ? shade(look.hairColor, -0.5) : INK;
  let out = s.ink(brush([a, m, c], BROW_W[spec.brow] * u * spec.line, { in: spec.brow === 'sharp' ? 0.1 : 0.2, out: 0.55, min: 0.25 }), shadowed ? INK : col);
  if (spec.brow === 'heavy') {
    // Gekiga: the brow ridge throws the eye into solid shadow.
    out += s.ink(brush([add(a, [0, 0.02 * u]), add(m, [0, 0.045 * u]), add(c, [0, 0.03 * u])], 0.04 * u, { in: 0.1, out: 0.4 }), INK, 0.8);
    if (mood === 'fierce' || mood === 'hurt') out += s.ink(brush([[-W * 0.5, y0 - 0.02 * u], [-W * 0.62, y0 - 0.07 * u]], 0.012 * u, { in: 0.3, out: 0.3 }));
  }
  return out;
}

function nose(s: Sheet, spec: StyleSpec, u: number): string {
  const ny = u * (spec.eyeY + (1 - spec.eyeY) * 0.46);
  const lw = spec.line;
  switch (spec.nose) {
    case 'tip':
      return s.ink(brush([[0.018 * u, ny - 0.035 * u], [0.034 * u, ny - 0.004 * u], [0.012 * u, ny + 0.006 * u]], 0.016 * u * lw, { in: 0.3, out: 0.4 }));
    case 'line':
    case 'long': {
      const top = spec.nose === 'long' ? spec.eyeY * u : spec.eyeY * u + 0.08 * u;
      return s.ink(brush([[0.012 * u, top], [0.028 * u, ny - 0.01 * u], [0.018 * u, ny + 0.006 * u], [0.004 * u, ny + 0.006 * u]], 0.012 * u * lw, { in: 0.6, out: 0.2 }));
    }
    case 'dot':
      return s.ink(brush([[0.004 * u, ny - 0.006 * u], [0.016 * u, ny + 0.004 * u]], 0.012 * u, { in: 0.3, out: 0.4 }));
    case 'full':
      return (
        s.ink(brush([[0.034 * u, spec.eyeY * u + 0.03 * u], [0.05 * u, ny - 0.05 * u], [0.055 * u, ny - 0.01 * u]], 0.014 * u * lw, { in: 0.5, out: 0.3 })) +
        s.ink(brush([[-0.055 * u, ny - 0.012 * u], [-0.045 * u, ny + 0.012 * u], [-0.018 * u, ny + 0.014 * u]], 0.012 * u * lw, { in: 0.3, out: 0.3 })) +
        s.ink(brush([[0.018 * u, ny + 0.014 * u], [0.045 * u, ny + 0.012 * u], [0.058 * u, ny - 0.008 * u]], 0.014 * u * lw, { in: 0.3, out: 0.3 })) +
        s.tone(smooth([[-0.04 * u, ny + 0.02 * u], [0.06 * u, ny + 0.02 * u], [0.03 * u, ny + 0.06 * u], [-0.02 * u, ny + 0.05 * u]], true), 'hatch', 0.7)
      );
    case 'button':
      return s.ink(brush([[0.02 * u, ny - 0.025 * u], [0.04 * u, ny], [0.02 * u, ny + 0.022 * u], [-0.004 * u, ny + 0.01 * u]], 0.016 * u * lw, { in: 0.2, out: 0.3 }));
    case 'hook':
      return s.ink(brush([[0.008 * u, ny - 0.05 * u], [0.03 * u, ny - 0.004 * u], [0.004 * u, ny + 0.01 * u]], 0.014 * u * lw, { in: 0.5, out: 0.4 }));
    case 'none':
      return '';
  }
}

function mouth(s: Sheet, spec: StyleSpec, mood: Mood, u: number): string {
  const my = u * (spec.eyeY + (1 - spec.eyeY) * (spec.eye === 'chibi' ? 0.62 : 0.74));
  const mw = spec.mouthW * u;
  const lw = 0.016 * u * spec.line;
  const comic = COMIC.has(spec.eye);
  const serious = spec.eye === 'rival' || spec.eye === 'seinen' || spec.eye === 'gekiga' || spec.eye === 'yokai' || spec.eye === 'bishonen';
  const line = (pts: P[], w = lw): string => s.ink(brush(pts, w, { in: 0.3, out: 0.3, min: 0.3 }));
  switch (mood) {
    case 'calm':
      if (spec.eye === 'chibi') return line([[-mw * 0.35, my - 0.01 * u], [-mw * 0.12, my + 0.02 * u], [0, my], [mw * 0.12, my + 0.02 * u], [mw * 0.35, my - 0.01 * u]], lw * 0.9);
      if (spec.eye === 'sanpaku') return line([[-mw * 0.45, my + 0.006 * u], [mw * 0.1, my + 0.004 * u], [mw * 0.5, my - 0.018 * u]]);
      if (spec.eye === 'shonen' || spec.eye === 'showa' || spec.eye === 'majokko') return line([[-mw * 0.45, my - 0.004 * u], [0, my + 0.014 * u], [mw * 0.45, my - 0.006 * u]]);
      if (spec.eye === 'gekiga' || spec.eye === 'seinen')
        return line([[-mw * 0.5, my + 0.004 * u], [0, my], [mw * 0.5, my + 0.006 * u]], lw * 1.1) + s.ink(brush([[-mw * 0.2, my + 0.04 * u], [mw * 0.2, my + 0.04 * u]], lw * 0.6, { in: 0.5, out: 0.5 }), INK, 0.6);
      return line([[-mw * 0.4, my], [0, my + 0.004 * u], [mw * 0.4, my - 0.002 * u]], lw * 0.9);
    case 'smile': {
      if (serious) return line([[-mw * 0.48, my - 0.014 * u], [-mw * 0.1, my + 0.012 * u], [mw * 0.2, my + 0.01 * u], [mw * 0.5, my - 0.018 * u]]);
      const h = mw * (comic ? 0.75 : 0.55);
      const d = `M${r1(-mw * 0.5)} ${r1(my - 0.01 * u)}Q0 ${r1(my + 0.012 * u)} ${r1(mw * 0.5)} ${r1(my - 0.01 * u)}Q${r1(mw * 0.3)} ${r1(my + h)} 0 ${r1(my + h * 0.95)}Q${r1(-mw * 0.3)} ${r1(my + h)} ${r1(-mw * 0.5)} ${r1(my - 0.01 * u)}Z`;
      const clip = s.uid('m');
      return `<clipPath id="${clip}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/><g clip-path="url(#${clip})"><path d="${ellipse([0, my + h * 0.95], mw * 0.36, h * 0.38)}" fill="${TONGUE}"/></g><path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(lw)}" stroke-linejoin="round"/>`;
    }
    case 'fierce': {
      if (comic || spec.eye === 'gekiga') {
        const w = mw * 0.62;
        const h = mw * 0.26;
        const d = `M${r1(-w)} ${r1(my - h * 0.5)}L${r1(w)} ${r1(my - h * 0.7)}L${r1(w * 0.9)} ${r1(my + h * 0.6)}L${r1(-w * 0.9)} ${r1(my + h * 0.5)}Z`;
        let teeth = `<path d="${d}" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(lw)}" stroke-linejoin="round"/>`;
        teeth += `<path d="M${r1(-w * 0.95)} ${r1(my)}L${r1(w * 0.95)} ${r1(my - h * 0.1)}" stroke="${INK}" stroke-width="${r1(lw * 0.6)}"/>`;
        for (const t of [-0.5, 0, 0.5]) teeth += `<path d="M${r1(w * t)} ${r1(my - h * 0.6)}L${r1(w * t)} ${r1(my + h * 0.55)}" stroke="${INK}" stroke-width="${r1(lw * 0.45)}"/>`;
        if (spec.eye === 'chibi' || spec.eye === 'shonen') teeth += `<path d="M${r1(w * 0.55)} ${r1(my - h * 0.62)}L${r1(w * 0.68)} ${r1(my - h * 0.05)}L${r1(w * 0.8)} ${r1(my - h * 0.64)}Z" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(lw * 0.5)}"/>`;
        return teeth;
      }
      return line([[-mw * 0.45, my + 0.016 * u], [0, my + 0.002 * u], [mw * 0.45, my + 0.018 * u]], lw * 1.1);
    }
    case 'hurt': {
      if (comic) {
        const pts: P[] = [];
        for (let i = 0; i <= 6; i++) pts.push([-mw * 0.45 + (mw * 0.9 * i) / 6, my + (i % 2 ? 0.014 : -0.006) * u]);
        const d = `${smooth(pts, false, 0.6)}Q0 ${r1(my + mw * 0.55)} ${pt(pts[0]!)}Z`;
        return `<path d="${d}" fill="${MOUTH}" stroke="${INK}" stroke-width="${r1(lw)}" stroke-linejoin="round"/>`;
      }
      const w = mw * 0.5;
      const h = mw * 0.18;
      return `<path d="M${r1(-w)} ${r1(my - h * 0.2)}Q0 ${r1(my - h * 0.9)} ${r1(w)} ${r1(my - h * 0.2)}L${r1(w * 0.9)} ${r1(my + h * 0.6)}Q0 ${r1(my + h * 0.2)} ${r1(-w * 0.9)} ${r1(my + h * 0.6)}Z" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(lw)}" stroke-linejoin="round"/><path d="M${r1(-w * 0.9)} ${r1(my + h * 0.15)}L${r1(w * 0.9)} ${r1(my + h * 0.15)}" stroke="${INK}" stroke-width="${r1(lw * 0.5)}"/>`;
    }
    case 'shock': {
      const rx = mw * (serious ? 0.22 : 0.3);
      const ry = mw * (serious ? 0.18 : 0.36);
      return `<path d="${ellipse([0, my + ry * 0.4], rx, ry)}" fill="${MOUTH}" stroke="${INK}" stroke-width="${r1(lw)}"/>`;
    }
  }
}

// ---------------------------------------------------------------------------
// Manpu: the symbols of manga feeling
// ---------------------------------------------------------------------------

/** The cross-popping vein of anger. */
export function vein(c: P, r: number, color = '#E0443A'): string {
  let out = '';
  for (let q = 0; q < 4; q++) {
    const a = (q * Math.PI) / 2 + Math.PI / 4;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const p0: P = [c[0] + dx * r * 0.25 - dy * r * 0.55, c[1] + dy * r * 0.25 + dx * r * 0.55];
    const p1: P = [c[0] + dx * r * 0.95, c[1] + dy * r * 0.95];
    const p2: P = [c[0] + dx * r * 0.25 + dy * r * 0.55, c[1] + dy * r * 0.25 - dx * r * 0.55];
    out += `<path d="${brush([p0, [c[0] + dx * r * 0.62 - dy * r * 0.3, c[1] + dy * r * 0.62 + dx * r * 0.3], p1], r * 0.26, { in: 0.1, out: 0.1, min: 0.5 })}" fill="${color}"/>`;
    out += `<path d="${brush([p1, [c[0] + dx * r * 0.62 + dy * r * 0.3, c[1] + dy * r * 0.62 - dx * r * 0.3], p2], r * 0.26, { in: 0.1, out: 0.1, min: 0.5 })}" fill="${color}"/>`;
  }
  return out;
}

/** A bead of sweat: embarrassment, strain, dismay. */
export function sweat(c: P, r: number, line: number): string {
  const d = `M${r1(c[0])} ${r1(c[1] - r * 1.5)}C${r1(c[0] + r * 0.3)} ${r1(c[1] - r * 0.6)} ${r1(c[0] + r)} ${r1(c[1] - r * 0.1)} ${r1(c[0] + r)} ${r1(c[1] + r * 0.35)}A${r1(r)} ${r1(r)} 0 1 1 ${r1(c[0] - r)} ${r1(c[1] + r * 0.35)}C${r1(c[0] - r)} ${r1(c[1] - r * 0.1)} ${r1(c[0] - r * 0.3)} ${r1(c[1] - r * 0.6)} ${r1(c[0])} ${r1(c[1] - r * 1.5)}Z`;
  return `<path d="${d}" fill="${SWEAT}" stroke="${INK}" stroke-width="${r1(line)}" stroke-linejoin="round"/><path d="M${r1(c[0] - r * 0.4)} ${r1(c[1] + r * 0.1)}Q${r1(c[0] - r * 0.45)} ${r1(c[1] + r * 0.7)} ${r1(c[0])} ${r1(c[1] + r * 0.85)}" fill="none" stroke="#fff" stroke-width="${r1(r * 0.28)}" stroke-linecap="round"/>`;
}

export function face(f: FaceIn): string {
  const { s, spec, look, mood, u } = f;
  const hw = (spec.headW * u) / 2;
  const W = spec.eyeW * u;
  const H = spec.eyeH * u;
  const ex = spec.eyeX * u;
  const ey = spec.eyeY * u;
  const shadowed = mood === 'fierce' && spec.anger === 'shadow';
  const [rs, ls] = eyeStates(mood, spec.eye);
  const head = headPath(spec, u);
  let out = '';

  const masked = look.wear.includes('mask');
  const blushC = mood === 'smile' || (mood === 'hurt' && (spec.eye === 'shoujo' || spec.eye === 'majokko'));
  if (blushC && !masked) {
    for (const side of [1, -1]) {
      const c: P = [side * hw * 0.58, ey + 0.13 * u];
      out += `<path d="${ellipse(c, hw * 0.2, 0.045 * u)}" fill="${BLUSH}" opacity=".32"/>`;
      for (let i = 0; i < 3; i++) out += s.ink(brush([[c[0] - side * 0.05 * u + side * i * 0.035 * u, c[1] - 0.025 * u], [c[0] - side * 0.07 * u + side * i * 0.035 * u, c[1] + 0.025 * u]], 0.01 * u, { in: 0.3, out: 0.3 }), '#C0404A', 0.8);
    }
  }
  if (look.wear.includes('tattoos')) {
    for (const side of [1, -1]) {
      const base: P = [side * hw * 0.72, ey + 0.1 * u];
      const stars: P[] = [base, add(base, [side * 0.06 * u, 0.07 * u]), add(base, [side * -0.02 * u, 0.14 * u])];
      out += `<path d="M${stars.map(pt).join('L')}" fill="none" stroke="${look.accent}" stroke-width="${r1(0.006 * u)}" opacity=".85"/>`;
      stars.forEach((p, i) => (out += `<path d="${sparkle(p, (i === 0 ? 0.03 : 0.022) * u, 0.2)}" fill="${look.accent}"/>`));
    }
  }
  if (look.wear.includes('plaster')) {
    const c: P = [-hw * 0.56, ey + 0.17 * u];
    out += `<g transform="rotate(-24 ${pt(c)})"><rect x="${r1(c[0] - 0.08 * u)}" y="${r1(c[1] - 0.028 * u)}" width="${r1(0.16 * u)}" height="${r1(0.056 * u)}" rx="${r1(0.02 * u)}" fill="#E9CFA8" stroke="${INK}" stroke-width="${r1(0.009 * u)}"/><rect x="${r1(c[0] - 0.03 * u)}" y="${r1(c[1] - 0.028 * u)}" width="${r1(0.06 * u)}" height="${r1(0.056 * u)}" fill="#F5E6CC" stroke="${INK}" stroke-width="${r1(0.006 * u)}"/></g>`;
  }
  if (shadowed) {
    const clip = s.uid('h');
    out += `<clipPath id="${clip}"><path d="${head}"/></clipPath><g clip-path="url(#${clip})"><rect x="${r1(-hw * 1.2)}" y="${r1(ey - 0.3 * u)}" width="${r1(hw * 2.4)}" height="${r1(0.36 * u)}" fill="${INK}" opacity=".42"/>${s.tone(`M${r1(-hw * 1.2)} ${r1(ey - 0.3 * u)}h${r1(hw * 2.4)}v${r1(0.42 * u)}h${r1(-hw * 2.4)}Z`, 'dotL', 0.5)}</g>`;
  }

  // Eyes: the right one as drawn, the left one mirrored. Yokai hide the left eye under the hair.
  out += `<g transform="translate(${r1(ex)} ${r1(ey)})">${eye(s, spec.eye, look, rs, W, H, u, spec.line, shadowed)}</g>`;
  out += `<g transform="translate(${r1(-ex)} ${r1(ey)}) scale(-1 1)">${eye(s, spec.eye, look, ls, W, H, u, spec.line, shadowed)}</g>`;
  if (shadowed) {
    // Eyes that glow out of the shadow.
    for (const x of [ex, -ex]) out += `<circle cx="${r1(x - 0.01 * u)}" cy="${r1(ey)}" r="${r1(0.012 * u)}" fill="${shade(look.eyes, 0.5)}"/>`;
  }
  if (look.wear.includes('beard')) out += beard(f);
  if (!masked) {
    out += nose(s, spec, u);
    out += mouth(s, spec, mood, u);
  } else {
    out += mask(f);
  }

  if (mood === 'hurt' && (spec.eye === 'shoujo' || spec.eye === 'majokko' || spec.eye === 'bishonen')) {
    const t: P = [ex + W * 0.45, ey + H * 0.5];
    out += `<path d="M${pt(t)}q${r1(0.01 * u)} ${r1(0.06 * u)} ${r1(-0.005 * u)} ${r1(0.12 * u)}" fill="none" stroke="${SWEAT}" stroke-width="${r1(0.018 * u)}" stroke-linecap="round"/>`;
  }
  return out;
}

/** Both brows. Drawn after the hair in traditions where brows show through the bangs. */
export function brows(f: FaceIn): string {
  const { s, spec, look, mood, u } = f;
  const shadowed = mood === 'fierce' && spec.anger === 'shadow';
  const ex = spec.eyeX * u;
  const ey = spec.eyeY * u;
  return (
    `<g transform="translate(${r1(ex)} ${r1(ey)})">${brow(s, spec, look, mood, u, shadowed)}</g>` +
    `<g transform="translate(${r1(-ex)} ${r1(ey)}) scale(-1 1)">${brow(s, spec, look, mood, u, shadowed)}</g>`
  );
}

/** A short, square beard and moustache, hatched in. */
function beard(f: FaceIn): string {
  const { s, spec, look, u } = f;
  const hw = (spec.headW * u) / 2;
  const my = u * (spec.eyeY + (1 - spec.eyeY) * 0.74);
  const c = look.hairColor;
  const jaw = smooth(
    [
      [hw * 0.98, spec.eyeY * u + 0.1 * u],
      [hw * 0.92, 0.82 * u],
      [hw * 0.5, 1.02 * u],
      [0, 1.08 * u],
      [-hw * 0.5, 1.02 * u],
      [-hw * 0.92, 0.82 * u],
      [-hw * 0.98, spec.eyeY * u + 0.1 * u],
      [-hw * 0.8, 0.78 * u],
      [-hw * 0.3, my + 0.06 * u],
      [0, my + 0.07 * u],
      [hw * 0.3, my + 0.06 * u],
      [hw * 0.8, 0.78 * u],
    ],
    true,
  );
  let out = s.shaded(jaw, c, { off: 0.04 * u, line: 1.3 * spec.line });
  out += s.tone(jaw, 'hatch', 0.35);
  const moustache = `M${r1(-0.16 * u)} ${r1(my - 0.012 * u)}Q${r1(-0.08 * u)} ${r1(my - 0.07 * u)} 0 ${r1(my - 0.045 * u)}Q${r1(0.08 * u)} ${r1(my - 0.07 * u)} ${r1(0.16 * u)} ${r1(my - 0.012 * u)}Q${r1(0.08 * u)} ${r1(my - 0.02 * u)} 0 ${r1(my - 0.018 * u)}Q${r1(-0.08 * u)} ${r1(my - 0.02 * u)} ${r1(-0.16 * u)} ${r1(my - 0.012 * u)}Z`;
  out += s.shaded(moustache, c, { off: 0.015 * u, line: 1.2 * spec.line });
  for (let i = 0; i < 10; i++) {
    const t = (i + 0.5) / 10;
    const x = -hw * 0.85 + t * hw * 1.7;
    const y = 0.86 * u + Math.cos((t - 0.5) * Math.PI) * 0.16 * u;
    out += s.ink(brush([[x, y - 0.04 * u], [x * 1.02, y + 0.03 * u]], 0.01 * u, { in: 0.2, out: 0.6 }), INK, 0.6);
  }
  return out;
}

/** The kunoichi's mask: cloth over the nose and mouth, running down into a neck gaiter. */
function mask(f: FaceIn): string {
  const { s, spec, look, u } = f;
  const hw = (spec.headW * u) / 2;
  const ny = u * (spec.eyeY + (1 - spec.eyeY) * 0.46);
  const clip = s.uid('k');
  const color = shade(look.outfit, 0.12);
  const top = ny - 0.07 * u;
  const d = `M${r1(-hw * 1.1)} ${r1(top + 0.03 * u)}Q0 ${r1(top - 0.05 * u)} ${r1(hw * 1.1)} ${r1(top + 0.03 * u)}V${r1(1.1 * u)}H${r1(-hw * 1.1)}Z`;
  let out = `<clipPath id="${clip}"><path d="${headPath(spec, u)}"/></clipPath><g clip-path="url(#${clip})">${s.shaded(d, color, { off: 0.05 * u, line: 1.3 * spec.line })}</g>`;
  const gaiter = `M${r1(-hw * 0.62)} ${r1(0.84 * u)}Q0 ${r1(1.02 * u)} ${r1(hw * 0.62)} ${r1(0.84 * u)}L${r1(hw * 0.66)} ${r1(u + spec.neck * u * 0.8)}Q0 ${r1(u + spec.neck * u * 0.9)} ${r1(-hw * 0.66)} ${r1(u + spec.neck * u * 0.8)}Z`;
  out += s.shaded(gaiter, color, { off: 0.04 * u, line: 1.3 * spec.line });
  out += s.ink(brush([[-hw * 0.5, ny + 0.06 * u], [0, ny + 0.1 * u], [hw * 0.4, ny + 0.05 * u]], 0.012 * u, { in: 0.4, out: 0.4 }), INK, 0.6);
  out += s.ink(brush([[-hw * 0.3, 0.9 * u], [0, 0.96 * u], [hw * 0.3, 0.9 * u]], 0.01 * u, { in: 0.4, out: 0.4 }), INK, 0.5);
  out += s.ink(brush([[0.02 * u, top + 0.01 * u], [0.04 * u, ny], [0.02 * u, ny + 0.03 * u]], 0.012 * u, { in: 0.4, out: 0.4 }), INK, 0.55);
  return out;
}

/** Symbols that sit over the hair: the vein, sweat, gloom lines and sparkles. */
export function manpu(f: FaceIn): string {
  const { s, spec, mood, u } = f;
  const hw = (spec.headW * u) / 2;
  const lw = 0.012 * u * spec.line;
  let out = '';
  if (mood === 'fierce' && spec.anger === 'vein') out += vein([hw * 0.72, 0.16 * u], 0.085 * u);
  if (mood === 'hurt') out += sweat([hw * 1.02, 0.34 * u], 0.05 * u, lw * 0.8);
  if (mood === 'shock') {
    out += sweat([hw * 1.05, 0.28 * u], 0.055 * u, lw * 0.8);
    out += sweat([-hw * 1.08, 0.42 * u], 0.04 * u, lw * 0.8);
    const band = `M${r1(-hw * 0.8)} ${r1(0.05 * u)}H${r1(hw * 0.8)}V${r1(0.4 * u)}H${r1(-hw * 0.8)}Z`;
    out += s.tone(band, 'dotM', 0.35);
    for (let i = 0; i < 9; i++) {
      const x = -hw * 0.7 + (hw * 1.4 * i) / 8;
      out += s.ink(brush([[x, 0.06 * u], [x, 0.22 * u + (i % 3) * 0.04 * u]], 0.012 * u, { in: 0, out: 0.8 }), INK, 0.75);
    }
  }
  if (mood === 'smile' && spec.sparkle) {
    out += `<path d="${sparkle([hw * 1.3, 0.22 * u], 0.1 * u)}" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(lw * 0.5)}"/>`;
    out += `<path d="${sparkle([-hw * 1.25, 0.5 * u], 0.07 * u)}" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(lw * 0.5)}"/>`;
    out += `<path d="${sparkle([hw * 1.12, 0.66 * u], 0.05 * u)}" fill="${PAPER}"/>`;
  }
  return out;
}
