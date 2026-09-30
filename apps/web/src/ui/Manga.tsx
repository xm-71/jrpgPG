import type { JSX } from 'preact';
import { rng } from '../art/manga/geom';

/**
 * Manga lettering and effects for the UI: focus lines (shuchusen) that pull the eye to a face,
 * speed lines (ryusen) for motion, and the jagged burst behind a shout.
 */

const f = (n: number): string => n.toFixed(1);

/** Thin wedges radiating in from the frame toward a centre, like a manga panel at its most intense moment. */
export function FocusLines({ seed = 'focus', color = '#16111D', count = 70, cx = 50, cy = 45, inner = 26, class: cls = '' }: { seed?: string; color?: string; count?: number; cx?: number; cy?: number; inner?: number; class?: string }): JSX.Element {
  const rand = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.05;
    const r0 = inner * (0.8 + rand() * 0.7);
    const w = 0.004 + rand() * 0.012;
    const far = 90;
    const x0 = cx + Math.cos(a) * r0;
    const y0 = cy + Math.sin(a) * r0;
    const x1 = cx + Math.cos(a - w) * far;
    const y1 = cy + Math.sin(a - w) * far;
    const x2 = cx + Math.cos(a + w) * far;
    const y2 = cy + Math.sin(a + w) * far;
    d += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z`;
  }
  return (
    <svg class={`focus-lines ${cls}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

/** Horizontal streaks of motion. */
export function SpeedLines({ seed = 'speed', color = '#FBF5EA', count = 34, class: cls = '' }: { seed?: string; color?: string; count?: number; class?: string }): JSX.Element {
  const rand = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const y = rand() * 100;
    const x0 = rand() * 60;
    const len = 20 + rand() * 60;
    const h = 0.25 + rand() * 0.7;
    d += `M${f(x0)} ${f(y)}L${f(x0 + len)} ${f(y - h / 2)}L${f(x0 + len)} ${f(y + h / 2)}Z`;
  }
  return (
    <svg class={`speed-lines ${cls}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

/** The outline of a shout: a jagged star, as an SVG path in a 100 x 100 box. */
export function burstPath(seed: string, points = 18, depth = 0.24): string {
  const rand = rng(seed);
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 50 * (1 - depth * (0.7 + rand() * 0.6));
    d += `${i === 0 ? 'M' : 'L'}${f(50 + Math.cos(a) * r)} ${f(50 + Math.sin(a) * r)}`;
  }
  return `${d}Z`;
}

/** A wobbling outline, for a line said through pain. */
export function wobblePath(seed: string, n = 26): string {
  const rand = rng(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 48 + (i % 2 ? 1.8 : -1.2) + rand() * 0.8;
    d += `${i === 0 ? 'M' : 'L'}${f(50 + Math.cos(a) * r)} ${f(50 + Math.sin(a) * r)}`;
  }
  return `${d}Z`;
}
