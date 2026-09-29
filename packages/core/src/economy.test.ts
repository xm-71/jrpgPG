import { describe, expect, test } from 'vitest';
import { EARN_CAPS, dayKey, earn, earnable, newLedger, rollLedger, weekKey } from './economy';

const at = (iso: string): number => Date.parse(iso);

describe('calendar keys', () => {
  test('days are UTC', () => {
    expect(dayKey(at('2026-09-29T00:00:00Z'))).toBe('2026-09-29');
    expect(dayKey(at('2026-09-29T23:59:59Z'))).toBe('2026-09-29');
    expect(dayKey(at('2026-09-30T00:00:00Z'))).toBe('2026-09-30');
  });

  test('weeks follow ISO 8601, including the year boundary', () => {
    expect(weekKey(at('2026-09-28T00:00:00Z'))).toBe('2026-W40'); // a Monday
    expect(weekKey(at('2026-09-29T12:00:00Z'))).toBe('2026-W40');
    expect(weekKey(at('2026-10-04T23:00:00Z'))).toBe('2026-W40'); // Sunday
    expect(weekKey(at('2026-10-05T00:00:00Z'))).toBe('2026-W41');
    expect(weekKey(at('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    expect(weekKey(at('2027-01-04T00:00:00Z'))).toBe('2027-W01');
  });
});

describe('earning Gloam', () => {
  const now = at('2026-09-29T10:00:00Z');

  test('sources without caps grant everything', () => {
    const l = newLedger(now);
    expect(earn(l, 'story', 500, now)).toBe(500);
    expect(earn(l, 'story', 500, now)).toBe(500);
    expect(earnable(l, 'story')).toBe(Infinity);
  });

  test('a daily cap stops at its limit and then pays nothing', () => {
    const l = newLedger(now);
    const cap = EARN_CAPS.task.daily!;
    let total = 0;
    for (let i = 0; i < 6; i++) total += earn(l, 'task', 25, now);
    expect(total).toBe(cap);
    expect(earn(l, 'task', 25, now)).toBe(0);
  });

  test('a partial amount is trimmed to what is left', () => {
    const l = newLedger(now);
    expect(earn(l, 'task', 70, now)).toBe(70);
    expect(earn(l, 'task', 25, now)).toBe(5);
  });

  test('the next day resets daily caps but not weekly ones', () => {
    const l = newLedger(now);
    earn(l, 'task', 75, now);
    earn(l, 'descentFloor', 300, now);
    const tomorrow = at('2026-09-30T10:00:00Z');
    expect(earn(l, 'task', 25, tomorrow)).toBe(25);
    expect(earn(l, 'descentFloor', 40, tomorrow)).toBe(0);
    const nextWeek = at('2026-10-05T10:00:00Z');
    expect(earn(l, 'descentFloor', 40, nextWeek)).toBe(40);
  });

  test('rolling the ledger is idempotent within a day', () => {
    const l = newLedger(now);
    earn(l, 'task', 25, now);
    rollLedger(l, now);
    rollLedger(l, now + 1000);
    expect(l.daily['task']).toBe(25);
  });

  test('bad amounts grant nothing', () => {
    const l = newLedger(now);
    expect(earn(l, 'story', -50, now)).toBe(0);
    expect(earn(l, 'story', 0, now)).toBe(0);
    expect(earn(l, 'story', 12.6, now)).toBe(13);
  });

  test('the weekly budget from free play is in the range the roadmap promises (about 20 pulls)', () => {
    const daily = EARN_CAPS.task.daily! + EARN_CAPS.descentDaily.daily!;
    const week = daily * 7 + EARN_CAPS.descentFloor.weekly! + EARN_CAPS.descentWeekly.weekly!;
    expect(week / 100).toBeGreaterThan(16);
    expect(week / 100).toBeLessThan(26);
  });
});
