/** Colour arithmetic for generated art. Colours are `#rrggbb`. */

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(c: [number, number, number]): string {
  return `#${((1 << 24) | (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2])).toString(16).slice(1)}`;
}

/** Lighten toward white (amount > 0) or darken toward black (amount < 0), by |amount| of the way. */
export function shade(hex: string, amount: number): string {
  const t = amount < 0 ? 0 : 255;
  const a = Math.abs(amount);
  return toHex(channels(hex).map((v) => v + (t - v) * a) as [number, number, number]);
}

/** Mix two colours, t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const x = channels(a);
  const y = channels(b);
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * t) as [number, number, number]);
}

/** Relative lightness, 0 to 1. */
export function lightness(hex: string): number {
  const [r, g, b] = channels(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
