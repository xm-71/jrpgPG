import { describe, expect, it } from 'vitest';
import { grow, placeCard, union } from './place';

const stage = { w: 390, h: 844 };
const card = { w: 330, h: 180 };
const none = { top: 0, bottom: 0 };

describe('placeCard', () => {
  it('centres the card across the stage, and in the middle when nothing is lit', () => {
    const p = placeCard(null, stage, card, none);
    expect(p).toEqual({ x: 30, y: 332, side: 'middle' });
  });

  it('goes below a lit part near the top', () => {
    const p = placeCard({ x: 20, y: 100, w: 350, h: 50 }, stage, card, none);
    expect(p.side).toBe('below');
    expect(p.y).toBe(162);
  });

  it('goes above a lit part near the bottom', () => {
    const p = placeCard({ x: 20, y: 700, w: 350, h: 100 }, stage, card, none);
    expect(p.side).toBe('above');
    expect(p.y).toBe(508);
  });

  it('takes the roomier side when both have room', () => {
    const p = placeCard({ x: 20, y: 500, w: 350, h: 100 }, stage, card, none);
    expect(p.side).toBe('above');
  });

  it('never covers the lit part when one side has room', () => {
    for (let y = 0; y <= 700; y += 25) {
      const hole = { x: 10, y, w: 370, h: 120 };
      const p = placeCard(hole, stage, card, none);
      if (p.side === 'over') continue;
      const overlaps = p.y < hole.y + hole.h && p.y + card.h > hole.y;
      expect(overlaps, `hole at ${y}`).toBe(false);
    }
  });

  it('sits on the far edge when the lit part fills the screen', () => {
    expect(placeCard({ x: 0, y: 20, w: 390, h: 800 }, stage, card, none)).toMatchObject({ side: 'over', y: 656 });
    expect(placeCard({ x: 0, y: 150, w: 390, h: 690 }, stage, card, none)).toMatchObject({ side: 'over', y: 8 });
  });

  it('keeps clear of the status bar and home indicator', () => {
    const inset = { top: 47, bottom: 34 };
    for (const hole of [null, { x: 0, y: 0, w: 390, h: 60 }, { x: 0, y: 780, w: 390, h: 64 }, { x: 0, y: 100, w: 390, h: 700 }]) {
      const p = placeCard(hole, stage, card, inset);
      expect(p.y).toBeGreaterThanOrEqual(inset.top);
      expect(p.y + card.h).toBeLessThanOrEqual(stage.h - inset.bottom);
    }
  });

  it('pins a card taller than the room to the top instead of throwing', () => {
    const p = placeCard(null, { w: 390, h: 200 }, { w: 330, h: 300 }, none);
    expect(p.y).toBe(8);
  });
});

describe('union', () => {
  it('is null for nothing and the box itself for one box', () => {
    expect(union([])).toBeNull();
    expect(union([{ x: 5, y: 6, w: 7, h: 8 }])).toEqual({ x: 5, y: 6, w: 7, h: 8 });
  });

  it('is the smallest box holding them all', () => {
    expect(union([{ x: 10, y: 10, w: 20, h: 20 }, { x: 100, y: 5, w: 10, h: 10 }, { x: 0, y: 50, w: 5, h: 5 }])).toEqual({ x: 0, y: 5, w: 110, h: 50 });
  });
});

describe('grow', () => {
  it('widens a box on every side', () => {
    expect(grow({ x: 50, y: 60, w: 100, h: 40 }, 6, stage)).toEqual({ x: 44, y: 54, w: 112, h: 52 });
  });

  it('stays inside the stage', () => {
    expect(grow({ x: 3, y: 2, w: 10, h: 10 }, 8, stage)).toEqual({ x: 0, y: 0, w: 21, h: 20 });
    expect(grow({ x: 380, y: 830, w: 10, h: 14 }, 8, stage)).toEqual({ x: 372, y: 822, w: 18, h: 22 });
  });
});
