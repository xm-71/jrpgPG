/**
 * Where foes stand, as fractions of the battle field. Shared by the Pixi scene and the DOM overlays
 * (plates, tap targets), so both agree without measuring each other.
 */

export interface Spot {
  /** Centre, 0 to 1 across. */
  x: number;
  /** Feet, 0 to 1 down. */
  y: number;
  /** Sprite height as a fraction of field height. */
  h: number;
  /** Width of the column the foe owns, 0 to 1. */
  col: number;
}

const FOE_H: Record<string, number> = { mob: 0.46, elite: 0.56, boss: 0.7 };

export function foeSpot(slot: number, count: number, tier: string): Spot {
  const n = Math.max(1, count);
  const col = 1 / n;
  const stagger = n > 2 && slot % 2 === 1 ? -0.035 : 0;
  const shrink = n >= 4 ? 0.82 : n === 3 ? 0.92 : 1;
  return { x: col * (slot + 0.5), y: 0.93 + stagger, h: (FOE_H[tier] ?? 0.46) * shrink, col };
}
