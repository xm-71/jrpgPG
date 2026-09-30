import { describe, expect, it } from 'vitest';
import { FIGHT_BASICS, GUIDE_SECTIONS, LESSONS, LESSON_LIST } from './lessons';
import { PITY, SPARK, pct } from './rules';

/** Every source file that can put a class name on the screen, read as text, except the lessons themselves and tests. */
const files = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.ts', '!./lessons.ts'], { query: '?raw', import: 'default', eager: true });

describe('the lesson catalogue', () => {
  it('has a unique id for every lesson', () => {
    const ids = LESSON_LIST.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(LESSONS).sort()).toEqual([...ids].sort());
    for (const l of LESSON_LIST) expect(LESSONS[l.id]).toBe(l);
  });

  it('gives every lesson a short title and a body that fits on a phone card', () => {
    for (const l of LESSON_LIST) {
      expect(l.title.trim(), l.id).not.toBe('');
      expect(l.title.length, `${l.id} title`).toBeLessThanOrEqual(40);
      expect(l.body.trim(), l.id).not.toBe('');
      expect(l.body.length, `${l.id} body`).toBeLessThanOrEqual(330);
      expect(l.body, `${l.id} body`).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('points every "Full rules" link at a real guide section', () => {
    const sections = new Set<string>(GUIDE_SECTIONS.map((g) => g.id));
    expect(sections.size).toBe(GUIDE_SECTIONS.length);
    for (const l of LESSON_LIST) if (l.more) expect(sections.has(l.more), `${l.id} -> ${l.more}`).toBe(true);
  });

  it('teaches the first fight in the order a turn goes, ending on a nudge to try it', () => {
    expect(FIGHT_BASICS).toEqual(['fight.light', 'fight.hand', 'fight.hold', 'fight.intent', 'fight.forecast', 'fight.try']);
    for (const id of FIGHT_BASICS) expect(LESSONS[id], id).toBeDefined();
    expect(FIGHT_BASICS.slice(0, -1).every((id) => LESSONS[id]!.mode === 'modal')).toBe(true);
    // The try-it lesson must never cover the hand it asks the player to tap.
    expect(LESSONS['fight.try']!.mode).toBe('nudge');
    expect(LESSONS['fight.end']!.mode).toBe('nudge');
  });

  it('gives every nudge a part of the screen to outline', () => {
    for (const l of LESSON_LIST) if (l.mode === 'nudge') expect(l.target, l.id).toBeTruthy();
  });

  it('only lights up class names the screens really use', () => {
    const source = Object.values(files).join('\n');
    const used = (name: string): boolean => new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(source);
    for (const l of LESSON_LIST) {
      if (!l.target) continue;
      const names = [...l.target.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]!);
      expect(names.length, `${l.id} target`).toBeGreaterThan(0);
      for (const n of names) expect(used(n), `${l.id}: nothing on screen has the class "${n}"`).toBe(true);
    }
  });
});

describe('the numbers the tutorial quotes', () => {
  it('formats rules as percentages', () => {
    expect(pct(0.25)).toBe('25%');
    expect(pct(1.5 - 1)).toBe('50%');
    // 3 steps of 20% is 0.6000000000000001 in floating point.
    expect(pct(0.2 * 3)).toBe('60%');
  });

  it('knows the pity and spark thresholds, which the Kindling lesson quotes', () => {
    expect(PITY).toBeGreaterThan(0);
    expect(SPARK).toBeGreaterThan(PITY);
    expect(LESSONS['kindling.first']!.body).toContain(`pull ${PITY}`);
    expect(LESSONS['kindling.first']!.body).toContain(`at ${SPARK}`);
  });
});
