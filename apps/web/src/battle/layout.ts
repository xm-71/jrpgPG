import type { Side } from '@duskline/core';

/**
 * Where units stand, as fractions of the battle canvas. Shared by the Pixi scene and the DOM
 * overlays (enemy plates, tap targets), so both agree without measuring each other.
 */

export interface Spot {
  /** Centre, 0 to 1 across. */
  x: number;
  /** Feet, 0 to 1 down. */
  y: number;
  /** Sprite height as a fraction of canvas height. */
  h: number;
  /** Width of the column the unit owns, 0 to 1. */
  col: number;
}

export const HORIZON = 0.46;

const FOE_H: Record<string, number> = { mob: 0.27, elite: 0.34, boss: 0.42, hero: 0.3 };

export function foeSpot(slot: number, count: number, tier: string): Spot {
  const col = 1 / Math.max(1, count);
  const stagger = count > 1 && slot % 2 === 1 ? 0.03 : 0;
  return { x: col * (slot + 0.5), y: HORIZON + 0.1 + stagger, h: FOE_H[tier] ?? 0.27, col };
}

export function partySpot(slot: number, count: number): Spot {
  const col = 1 / Math.max(1, count);
  const stagger = slot % 2 === 1 ? -0.03 : 0;
  return { x: col * (slot + 0.5), y: 0.97 + stagger, h: 0.38, col };
}

export function spotFor(side: Side, slot: number, count: number, tier: string): Spot {
  return side === 'foe' ? foeSpot(slot, count, tier) : partySpot(slot, count);
}
