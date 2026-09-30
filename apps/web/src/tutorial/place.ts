/** Where the coach card goes: next to the part of the screen it is about, without covering it if it can help it. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 12;
const EDGE = 8;

export interface Placement {
  x: number;
  y: number;
  side: 'above' | 'below' | 'over' | 'middle';
}

/**
 * `hole` is the lit part of the screen, in stage coordinates, or null for a card in the middle.
 * `inset` is the room the phone keeps at the top and bottom for its status bar and home indicator.
 */
export function placeCard(hole: Box | null, stage: { w: number; h: number }, card: { w: number; h: number }, inset: { top: number; bottom: number }): Placement {
  const x = Math.round((stage.w - card.w) / 2);
  const min = inset.top + EDGE;
  const max = Math.max(min, stage.h - inset.bottom - card.h - EDGE);
  const clamp = (y: number): number => Math.round(Math.min(max, Math.max(min, y)));
  if (!hole) return { x, y: clamp((min + max) / 2), side: 'middle' };
  const above = hole.y - inset.top - GAP;
  const below = stage.h - inset.bottom - (hole.y + hole.h) - GAP;
  const need = card.h + EDGE;
  if (below >= need && (below >= above || above < need)) return { x, y: clamp(hole.y + hole.h + GAP), side: 'below' };
  if (above >= need) return { x, y: clamp(hole.y - GAP - card.h), side: 'above' };
  // Neither side has room (the lit part is most of the screen): sit on the far edge from its centre.
  const centre = hole.y + hole.h / 2;
  return { x, y: centre < stage.h / 2 ? max : min, side: 'over' };
}

/** The smallest box holding every box, or null when there are none. */
export function union(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Grow a box by `by` on every side, kept inside the stage. */
export function grow(b: Box, by: number, stage: { w: number; h: number }): Box {
  const x = Math.max(0, b.x - by);
  const y = Math.max(0, b.y - by);
  return { x, y, w: Math.min(stage.w, b.x + b.w + by) - x, h: Math.min(stage.h, b.y + b.h + by) - y };
}
