import { shade } from '../color';
import { r1 } from './geom';

/**
 * Ink, paper and tone. Every figure is drawn in colour with manga inking: a heavy outline around
 * the whole silhouette, finer lines inside, and shadows laid in with screentone (dots), hatching,
 * stipple or solid black, depending on the tradition the hero is drawn in.
 */

export const INK = '#16111D';
export const PAPER = '#FBF5EA';
export const BLUSH = '#E8707A';
export const MOUTH = '#5E1B22';
export const TONGUE = '#D06A72';
export const SWEAT = '#D8ECF6';

/** How a tradition lays in its shadows. */
export type Shading = 'dots' | 'soft' | 'hatch' | 'beta' | 'stipple' | 'flat';

/** Builds one SVG document: hands out unique ids and knows the tone patterns. */
export class Sheet {
  private n = 0;

  constructor(
    readonly id: string,
    /** Pattern scale, so tone reads the same size whatever the crop. */
    readonly k: number,
    readonly shading: Shading,
  ) {}

  uid(prefix: string): string {
    return `${this.id}-${prefix}${this.n++}`;
  }

  url(name: 'dotS' | 'dotM' | 'dotL' | 'hatch' | 'xhatch' | 'stip' | 'fade'): string {
    return `url(#${this.id}-${name})`;
  }

  /** The screentones, hatching and stipple every figure may use. */
  defs(): string {
    const k = this.k;
    const s = (n: number): string => r1(n * k);
    const cell = 4.2 * k;
    const dot = (name: string, r: number): string =>
      `<pattern id="${this.id}-${name}" width="${r1(cell)}" height="${r1(cell)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${r1(cell / 2)}" cy="${r1(cell / 2)}" r="${s(r)}" fill="${INK}"/></pattern>`;
    let stip = '';
    let seed = 7;
    for (let i = 0; i < 26; i++) {
      seed = (seed * 16807) % 2147483647;
      const x = (seed % 1000) / 1000;
      seed = (seed * 16807) % 2147483647;
      const y = (seed % 1000) / 1000;
      stip += `<circle cx="${s(x * 18)}" cy="${s(y * 18)}" r="${s(0.55 + (i % 3) * 0.18)}" fill="${INK}"/>`;
    }
    return `<defs>
  ${dot('dotS', 0.75)}${dot('dotM', 1.15)}${dot('dotL', 1.6)}
  <pattern id="${this.id}-hatch" width="${s(3.4)}" height="${s(3.4)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="${s(3.4)}" height="${s(0.9)}" fill="${INK}"/></pattern>
  <pattern id="${this.id}-xhatch" width="${s(3.4)}" height="${s(3.4)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="${s(3.4)}" height="${s(1)}" fill="${INK}"/><rect width="${s(1)}" height="${s(3.4)}" fill="${INK}"/></pattern>
  <pattern id="${this.id}-stip" width="${s(18)}" height="${s(18)}" patternUnits="userSpaceOnUse">${stip}</pattern>
</defs>`;
  }

  /** The tone this tradition uses in a shadow, and how strongly. */
  shadowTone(): { url: string; opacity: number } | null {
    switch (this.shading) {
      case 'dots':
        return { url: this.url('dotM'), opacity: 0.42 };
      case 'soft':
        return { url: this.url('dotS'), opacity: 0.36 };
      case 'hatch':
        return { url: this.url('hatch'), opacity: 0.5 };
      case 'beta':
        return { url: this.url('xhatch'), opacity: 0.55 };
      case 'stipple':
        return { url: this.url('stip'), opacity: 0.75 };
      case 'flat':
        return null;
    }
  }

  /** How much darker a shadow is than its base colour. */
  shadowDepth(): number {
    return this.shading === 'beta' ? -0.5 : this.shading === 'flat' ? -0.16 : this.shading === 'soft' ? -0.14 : -0.24;
  }

  /**
   * A shape in `base` colour, shaded on the side away from the light. The shadow is what is left
   * when the lit shape is slid toward the light: a crescent along the lower right, laid in with
   * this tradition's tone. `off` is how far the light reaches around the form.
   */
  shaded(d: string, base: string, o: { off?: number; line?: number; tone?: boolean; depth?: number } = {}): string {
    const off = o.off ?? 6 * this.k;
    const clip = this.uid('c');
    const tone = o.tone === false ? null : this.shadowTone();
    const dark = shade(base, o.depth ?? this.shadowDepth());
    const line = o.line ?? 1.5 * this.k;
    return `<clipPath id="${clip}"><path d="${d}"/></clipPath><path d="${d}" fill="${dark}"/><g clip-path="url(#${clip})">${tone ? `<path d="${d}" fill="${tone.url}" opacity="${tone.opacity}"/>` : ''}<path d="${d}" fill="${base}" transform="translate(${r1(-off)} ${r1(-off * 0.55)})"/></g>${line > 0 ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(line)}" stroke-linejoin="round"/>` : ''}`;
  }

  /** A flat shape with an ink outline and no shading. */
  flat(d: string, fill: string, line = 1.5 * this.k): string {
    return `<path d="${d}" fill="${fill}"${line > 0 ? ` stroke="${INK}" stroke-width="${r1(line)}" stroke-linejoin="round"` : ''}/>`;
  }

  /** Solid ink: brush strokes, pupils, spot blacks. */
  ink(d: string, fill = INK, opacity = 1): string {
    return `<path d="${d}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
  }

  /** A tone laid over a shape (no colour change): for hair shadow bands, cast shadows, gloom. */
  tone(d: string, which: 'dotS' | 'dotM' | 'dotL' | 'hatch' | 'xhatch' | 'stip', opacity = 0.5): string {
    return `<path d="${d}" fill="${this.url(which)}" opacity="${opacity}"/>`;
  }

  /** A cast shadow in the shading of this tradition: a darker colour with tone over it. */
  castShadow(d: string, base: string, opacity = 1): string {
    const t = this.shadowTone();
    return `<g opacity="${opacity}"><path d="${d}" fill="${shade(base, this.shadowDepth())}"/>${t ? `<path d="${d}" fill="${t.url}" opacity="${t.opacity}"/>` : ''}</g>`;
  }
}
