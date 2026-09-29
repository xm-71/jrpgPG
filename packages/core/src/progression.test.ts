import { describe, expect, test } from 'vitest';
import { MAX_RANK } from './battle/scaling';
import { applyXp, xpToNext } from './progression';

describe('Lamplighter Rank', () => {
  test('each rank asks for a little more XP than the last', () => {
    expect(xpToNext(1)).toBe(40);
    expect(xpToNext(2)).toBe(60);
    expect(xpToNext(6)).toBe(140);
  });

  test('XP carries over and can gain several ranks at once', () => {
    expect(applyXp({ rank: 1, xp: 0 }, 30)).toEqual({ rank: 1, xp: 30, ranksGained: 0 });
    expect(applyXp({ rank: 1, xp: 30 }, 20)).toEqual({ rank: 2, xp: 10, ranksGained: 1 });
    expect(applyXp({ rank: 1, xp: 0 }, 40 + 60 + 80 + 5)).toEqual({ rank: 4, xp: 5, ranksGained: 3 });
  });

  test('the story XP is tuned so the player arrives at each stage at that stage’s level', () => {
    const stageXp = [40, 60, 80, 100, 120, 140, 160];
    let s = { rank: 1, xp: 0 };
    const enteredAt: number[] = [];
    for (const xp of stageXp) {
      enteredAt.push(s.rank);
      s = applyXp(s, xp);
    }
    expect(enteredAt).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('stops at the maximum rank', () => {
    const r = applyXp({ rank: MAX_RANK - 1, xp: 0 }, 1_000_000);
    expect(r.rank).toBe(MAX_RANK);
    expect(r.xp).toBe(0);
    expect(applyXp({ rank: 3, xp: 5 }, -10).xp).toBe(5);
  });
});
