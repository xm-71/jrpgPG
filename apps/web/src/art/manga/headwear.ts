import type { Look } from '@duskline/core';
import { mix, shade } from '../color';
import { type P, brush, ellipse, pt, r1, smooth, sparkle } from './geom';
import { INK, PAPER, type Sheet } from './ink';
import type { StyleSpec } from './styles';

/** Hats, goggles and crowns, drawn over the hair in head-local coordinates. */
export function headwear(s: Sheet, spec: StyleSpec, look: Look, u: number): string {
  const hw = (spec.headW * u) / 2;
  const line = 1.5 * spec.line;
  const wear = new Set(look.wear);
  let out = '';

  if (wear.has('goggles')) {
    const strap = `M${r1(-hw * 1.25)} ${r1(0.2 * u)}Q0 ${r1(-0.02 * u)} ${r1(hw * 1.25)} ${r1(0.2 * u)}L${r1(hw * 1.25)} ${r1(0.28 * u)}Q0 ${r1(0.06 * u)} ${r1(-hw * 1.25)} ${r1(0.28 * u)}Z`;
    out += s.shaded(strap, '#5A3A2A', { off: 0.02 * u, line });
    for (const x of [-0.19, 0.19]) {
      const c: P = [x * u, 0.1 * u];
      out += s.shaded(ellipse(c, 0.15 * u, 0.13 * u), look.accent, { off: 0.03 * u, line });
      out += `<path d="${ellipse(c, 0.11 * u, 0.095 * u)}" fill="#BFE6F0" stroke="${INK}" stroke-width="${r1(line * 0.8)}"/>`;
      out += `<path d="M${r1(c[0] - 0.06 * u)} ${r1(c[1] - 0.02 * u)}Q${r1(c[0] - 0.04 * u)} ${r1(c[1] - 0.07 * u)} ${r1(c[0] + 0.02 * u)} ${r1(c[1] - 0.075 * u)}" fill="none" stroke="#fff" stroke-width="${r1(0.022 * u)}" stroke-linecap="round"/>`;
    }
  }

  if (wear.has('hat')) {
    const khaki = '#D8C38C';
    const brim = ellipse([0, 0.16 * u], hw * 1.75, 0.16 * u);
    out += s.shaded(brim, shade(khaki, -0.08), { off: 0.04 * u, line });
    const crown = `M${r1(-hw * 0.98)} ${r1(0.18 * u)}C${r1(-hw * 1.02)} ${r1(-0.3 * u)} ${r1(-hw * 0.5)} ${r1(-0.46 * u)} 0 ${r1(-0.46 * u)}C${r1(hw * 0.5)} ${r1(-0.46 * u)} ${r1(hw * 1.02)} ${r1(-0.3 * u)} ${r1(hw * 0.98)} ${r1(0.18 * u)}Q0 ${r1(0.28 * u)} ${r1(-hw * 0.98)} ${r1(0.18 * u)}Z`;
    out += s.shaded(crown, khaki, { off: 0.06 * u, line });
    out += s.flat(`M${r1(-hw * 0.99)} ${r1(0.05 * u)}Q0 ${r1(0.14 * u)} ${r1(hw * 0.99)} ${r1(0.05 * u)}L${r1(hw * 0.98)} ${r1(0.17 * u)}Q0 ${r1(0.27 * u)} ${r1(-hw * 0.98)} ${r1(0.17 * u)}Z`, look.accent, line);
    out += s.ink(brush([[-hw * 0.2, -0.4 * u], [0, -0.1 * u], [hw * 0.05, 0.06 * u]], 0.014 * u, { in: 0.3, out: 0.3 }), INK, 0.6);
  }

  if (wear.has('witchhat')) {
    const brim = ellipse([0, 0.04 * u], hw * 1.8, 0.17 * u);
    out += s.shaded(brim, shade(look.outfit, 0.08), { off: 0.04 * u, line });
    const cone = smooth([[-hw * 0.95, 0.06 * u], [-hw * 0.55, -0.5 * u], [-hw * 0.1, -1.0 * u], [hw * 0.55, -1.32 * u], [hw * 1.05, -1.18 * u], [hw * 0.55, -1.02 * u], [hw * 0.45, -0.5 * u], [hw * 0.95, 0.06 * u]], false) + `Q0 ${r1(0.18 * u)} ${r1(-hw * 0.95)} ${r1(0.06 * u)}Z`;
    out += s.shaded(cone, look.outfit, { off: 0.07 * u, line });
    out += s.flat(`M${r1(-hw * 0.9)} ${r1(-0.08 * u)}Q0 ${r1(0.02 * u)} ${r1(hw * 0.9)} ${r1(-0.08 * u)}L${r1(hw * 0.96)} ${r1(0.06 * u)}Q0 ${r1(0.18 * u)} ${r1(-hw * 0.96)} ${r1(0.06 * u)}Z`, look.accent, line);
    out += `<path d="${sparkle([hw * 0.2, -0.02 * u], 0.1 * u, 0.22)}" fill="${PAPER}" stroke="${INK}" stroke-width="${r1(line * 0.5)}"/>`;
    // A wire antenna off the tip, fizzing.
    const tip: P = [hw * 1.02, -1.18 * u];
    out += `<path d="M${pt(tip)}l${r1(0.12 * u)} ${r1(-0.1 * u)}l${r1(-0.04 * u)} ${r1(-0.08 * u)}l${r1(0.12 * u)} ${r1(-0.08 * u)}" fill="none" stroke="${INK}" stroke-width="${r1(0.03 * u)}" stroke-linejoin="round"/>`;
    out += `<path d="${sparkle([tip[0] + 0.2 * u, tip[1] - 0.28 * u], 0.08 * u, 0.2)}" fill="${look.accent}"/>`;
  }

  if (wear.has('tiara')) {
    let d = `M${r1(-hw * 0.62)} ${r1(0.02 * u)}`;
    const peaks = [-0.62, -0.42, -0.22, 0, 0.22, 0.42, 0.62];
    peaks.forEach((x, i) => {
      if (i === 0) return;
      const mid = (peaks[i - 1]! + x) / 2;
      const h = i === 4 ? 0.3 : i % 2 ? 0.16 : 0.2;
      d += `L${r1(mid * hw)} ${r1((0.02 - h) * u)}L${r1(x * hw)} ${r1(0.02 * u)}`;
    });
    d += `L${r1(hw * 0.6)} ${r1(0.08 * u)}Q0 ${r1(0.12 * u)} ${r1(-hw * 0.6)} ${r1(0.08 * u)}Z`;
    out += s.shaded(d, mix('#D9A441', '#F4D98A', 0.4), { off: 0.02 * u, line: line * 0.8 });
    out += `<circle cx="0" cy="${r1(-0.06 * u)}" r="${r1(0.045 * u)}" fill="${look.accent}" stroke="${INK}" stroke-width="${r1(line * 0.5)}"/>`;
    out += `<circle cx="${r1(-hw * 0.32)}" cy="${r1(0.0 * u)}" r="${r1(0.025 * u)}" fill="${look.accent}"/><circle cx="${r1(hw * 0.32)}" cy="${r1(0.0 * u)}" r="${r1(0.025 * u)}" fill="${look.accent}"/>`;
  }
  return out;
}
