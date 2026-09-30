import { computed, signal } from '@preact/signals';
import { mutate, profile, toast } from '../game/store';
import { ask } from '../ui/Dialog';
import { LESSONS, type GuideSection, type Lesson } from './lessons';

/**
 * The coach: shows each lesson once, when its situation first comes up, and remembers in the save which
 * ones the player has seen. Everything is kept in `progress.flags`, so it travels with Copy save and
 * Paste a save, and needs no change to the save format:
 *
 *   coach:on          hints are wanted (chosen when the player first taps Begin, or in Settings)
 *   coach:offered     the first-launch offer has been made
 *   coach:seen:<id>   that lesson has been shown
 */

const flag = (name: string): boolean => profile.peek().progress.flags[name] === true;

/** Hints are on: lessons appear. Saves that predate the tutorial have this off. */
export const coachOn = computed(() => profile.value.progress.flags['coach:on'] === true);

export const hasSeen = (id: string): boolean => flag(`coach:seen:${id}`);
export const wasOffered = (): boolean => flag('coach:offered');

/** What the overlay is showing. */
export interface Shown {
  lesson: Lesson;
  /** Place in the run of lessons it came with, such as 2 of 6. */
  step: number;
  of: number;
  /** The screen that asked, so leaving it can take the lesson back. */
  scope: string;
}

export const shown = signal<Shown | null>(null);
/** A guide section the player asked to read from a lesson, shown over the game. */
export const helpOpen = signal<GuideSection | null>(null);

interface Entry {
  id: string;
  scope: string;
  step: number;
  of: number;
}

let queue: Entry[] = [];

const queued = (id: string): boolean => shown.value?.lesson.id === id || queue.some((e) => e.id === id);

function pump(): void {
  while (!shown.value && queue.length > 0) {
    const e = queue.shift()!;
    const lesson = LESSONS[e.id];
    if (lesson) shown.value = { lesson, step: e.step, of: e.of, scope: e.scope };
  }
}

function markSeen(id: string): void {
  if (hasSeen(id)) return;
  mutate((p) => {
    p.progress.flags[`coach:seen:${id}`] = true;
  });
}

/** Queue lessons a screen wants to give, in order. Ones already seen or already waiting are skipped. */
export function teach(ids: readonly string[], scope: string): void {
  if (!coachOn.peek()) return;
  const fresh = ids.filter((id) => LESSONS[id] && !hasSeen(id) && !queued(id));
  fresh.forEach((id, i) => queue.push({ id, scope, step: i + 1, of: fresh.length }));
  pump();
}

/** The player did what a lesson asked, or finished reading it: it is done, and the next one shows. */
export function complete(id: string): void {
  queue = queue.filter((e) => e.id !== id);
  if (shown.value?.lesson.id === id) shown.value = null;
  if (coachOn.peek()) markSeen(id);
  pump();
}

/** Next / Got it. */
export function advance(): void {
  const cur = shown.value;
  if (cur) complete(cur.lesson.id);
}

/** A screen is going away: withdraw what it asked for, without counting it as seen. */
export function clear(scope: string): void {
  queue = queue.filter((e) => e.scope !== scope);
  if (shown.value?.scope === scope) shown.value = null;
  pump();
}

function drop(): void {
  queue = [];
  shown.value = null;
}

/** Turn hints off. Nothing else changes, and Settings can turn them back on. */
export function skipTutorial(): void {
  drop();
  mutate((p) => {
    p.progress.flags['coach:on'] = false;
  });
  toast('Hints are off. You can turn them back on in Settings.', 'info', 4200);
}

/** Turn hints on and, when `again`, forget which lessons were seen so the whole tutorial plays afresh. */
export function startTutorial(again: boolean): void {
  drop();
  mutate((p) => {
    if (again) for (const key of Object.keys(p.progress.flags)) if (key.startsWith('coach:seen:')) delete p.progress.flags[key];
    p.progress.flags['coach:on'] = true;
    p.progress.flags['coach:offered'] = true;
  });
}

/** The first time a new player taps Begin: offer the tutorial, and remember the answer either way. */
export async function offerTutorial(): Promise<void> {
  if (wasOffered()) return;
  const yes = await ask({
    title: 'Want a guide?',
    body: 'A short guide can coach your first fight, and explain each new part of the game the first time you meet it. You can turn it off or replay it any time in Settings.',
    confirm: 'Guide me',
    cancel: 'I will work it out',
  });
  mutate((p) => {
    p.progress.flags['coach:offered'] = true;
    p.progress.flags['coach:on'] = yes;
  });
}
