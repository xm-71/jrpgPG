import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newProfile, normalizeProfile } from '@duskline/core';
import { STARTER_HEROES } from '@duskline/content';

vi.mock('../ui/Dialog', () => ({ ask: vi.fn() }));

import { ask } from '../ui/Dialog';
import { profile, replaceProfile, toasts } from '../game/store';
import { advance, clear, coachOn, complete, hasSeen, offerTutorial, shown, skipTutorial, startTutorial, teach, wasOffered } from './coach';

const NOW = Date.UTC(2026, 8, 29);
const flags = (): Record<string, boolean> => profile.value.progress.flags;
const showing = (): string | undefined => shown.value?.lesson.id;

/** A new save, with hints on or off, and nothing waiting in the coach. */
function reset(on: boolean): void {
  startTutorial(false); // empties the queue and the overlay
  replaceProfile(newProfile(NOW, STARTER_HEROES));
  if (on) startTutorial(false);
}

beforeEach(() => {
  vi.useFakeTimers();
  toasts.value = [];
  vi.mocked(ask).mockReset();
});
afterEach(() => vi.useRealTimers());

describe('a new save', () => {
  it('has hints off, nothing offered and nothing seen, so saves from before the tutorial stay quiet', () => {
    reset(false);
    expect(coachOn.value).toBe(false);
    expect(wasOffered()).toBe(false);
    expect(hasSeen('fight.light')).toBe(false);
    teach(['fight.light'], 'fight');
    expect(showing()).toBeUndefined();
  });
});

describe('teaching lessons', () => {
  it('shows the first lesson and queues the rest, counting the steps', () => {
    reset(true);
    teach(['fight.light', 'fight.hand', 'fight.hold'], 'fight');
    expect(shown.value).toMatchObject({ step: 1, of: 3, scope: 'fight' });
    expect(showing()).toBe('fight.light');
    advance();
    expect(shown.value).toMatchObject({ step: 2, of: 3 });
    expect(showing()).toBe('fight.hand');
    advance();
    expect(showing()).toBe('fight.hold');
    advance();
    expect(showing()).toBeUndefined();
  });

  it('remembers each lesson in the save the moment it is done', () => {
    reset(true);
    teach(['fight.light', 'fight.hand'], 'fight');
    expect(hasSeen('fight.light')).toBe(false);
    advance();
    expect(hasSeen('fight.light')).toBe(true);
    expect(flags()['coach:seen:fight.light']).toBe(true);
    expect(hasSeen('fight.hand')).toBe(false);
  });

  it('never teaches a lesson twice', () => {
    reset(true);
    teach(['fight.light'], 'fight');
    advance();
    teach(['fight.light'], 'fight');
    expect(showing()).toBeUndefined();
  });

  it('ignores a lesson that is already showing or waiting, and ids it does not know', () => {
    reset(true);
    teach(['fight.light', 'fight.hand'], 'a');
    teach(['fight.light', 'fight.hand', 'no.such.lesson'], 'b');
    advance();
    advance();
    expect(showing()).toBeUndefined();
  });

  it('marks a waiting lesson seen when the player does what it asked, without showing it', () => {
    reset(true);
    teach(['fight.light', 'fight.try'], 'fight');
    complete('fight.try');
    expect(showing()).toBe('fight.light');
    advance();
    expect(showing()).toBeUndefined();
    expect(hasSeen('fight.try')).toBe(true);
  });

  it('takes a screen\'s lessons back when it goes, without counting them as seen', () => {
    reset(true);
    teach(['fight.light', 'fight.hand'], 'fight');
    clear('fight');
    expect(showing()).toBeUndefined();
    expect(hasSeen('fight.light')).toBe(false);
    teach(['fight.light'], 'fight');
    expect(showing()).toBe('fight.light');
  });

  it('keeps another screen\'s lessons when one goes, and shows them next', () => {
    reset(true);
    teach(['fight.light'], 'fight');
    teach(['home.first'], 'home');
    clear('fight');
    expect(showing()).toBe('home.first');
    expect(shown.value?.scope).toBe('home');
  });
});

describe('hints on and off', () => {
  it('skipping turns hints off, withdraws the lesson on screen, and keeps what was seen', () => {
    reset(true);
    teach(['fight.light', 'fight.hand'], 'fight');
    advance();
    skipTutorial();
    expect(coachOn.value).toBe(false);
    expect(showing()).toBeUndefined();
    expect(hasSeen('fight.light')).toBe(true);
    expect(toasts.value.some((t) => /Hints are off/.test(t.text))).toBe(true);
    teach(['fight.weak'], 'fight');
    expect(showing()).toBeUndefined();
  });

  it('turning hints back on carries on where the player left off', () => {
    reset(true);
    teach(['fight.light'], 'fight');
    advance();
    skipTutorial();
    startTutorial(false);
    expect(coachOn.value).toBe(true);
    teach(['fight.light', 'fight.hand'], 'fight');
    expect(showing()).toBe('fight.hand');
  });

  it('replaying forgets what was seen, and nothing else in the save', () => {
    reset(true);
    mutateFlag('story:something');
    teach(['fight.light'], 'fight');
    advance();
    startTutorial(true);
    expect(hasSeen('fight.light')).toBe(false);
    expect(flags()['story:something']).toBe(true);
    expect(coachOn.value).toBe(true);
    teach(['fight.light'], 'fight');
    expect(showing()).toBe('fight.light');
  });
});

describe('the first-launch offer', () => {
  it('turns hints on when the player says yes, and remembers it was asked', async () => {
    reset(false);
    vi.mocked(ask).mockResolvedValue(true);
    await offerTutorial();
    expect(coachOn.value).toBe(true);
    expect(wasOffered()).toBe(true);
  });

  it('leaves hints off when the player says no, and still remembers it was asked', async () => {
    reset(false);
    vi.mocked(ask).mockResolvedValue(false);
    await offerTutorial();
    expect(coachOn.value).toBe(false);
    expect(wasOffered()).toBe(true);
  });

  it('asks once only', async () => {
    reset(false);
    vi.mocked(ask).mockResolvedValue(false);
    await offerTutorial();
    await offerTutorial();
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('does not ask a player who already turned hints on in Settings', async () => {
    reset(false);
    startTutorial(false);
    await offerTutorial();
    expect(ask).not.toHaveBeenCalled();
  });
});

describe('saving', () => {
  it('lives in the save\'s flags, so Copy save and Paste a save carry it', () => {
    reset(true);
    teach(['fight.light'], 'fight');
    advance();
    const pasted = normalizeProfile(JSON.parse(JSON.stringify(profile.value)), NOW, STARTER_HEROES);
    expect(pasted?.progress.flags['coach:on']).toBe(true);
    expect(pasted?.progress.flags['coach:offered']).toBe(true);
    expect(pasted?.progress.flags['coach:seen:fight.light']).toBe(true);
  });
});

function mutateFlag(name: string): void {
  const next = structuredClone(profile.value);
  next.progress.flags[name] = true;
  replaceProfile(next);
}
