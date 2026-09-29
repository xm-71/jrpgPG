import { signal, computed } from '@preact/signals';
import type { Profile } from '@duskline/core';
import { now } from './clock';
import { eraseProfile, isPersistent, loadProfile, saveProfile } from './persist';

const loaded = loadProfile(now());

export const profile = signal<Profile>(loaded.profile);
export const isFreshSave = signal(loaded.fresh);
export const recoveredSave = signal(loaded.recovered);
export const savingWorks = signal(isPersistent());

if (loaded.fresh) saveProfile(loaded.profile);

/**
 * Change the profile. The callback edits a copy, the copy becomes the new value, and it is saved
 * straight away, so closing the tab never loses progress. Returns whatever the callback returns.
 */
export function mutate<T>(fn: (p: Profile) => T): T {
  const next = structuredClone(profile.peek());
  const out = fn(next);
  next.updatedAt = now();
  profile.value = next;
  saveProfile(next);
  savingWorks.value = isPersistent();
  return out;
}

export function replaceProfile(p: Profile): void {
  profile.value = p;
  saveProfile(p);
}

export function resetProfile(fresh: Profile): void {
  eraseProfile();
  replaceProfile(fresh);
}

export const settings = computed(() => profile.value.settings);

// --- toasts ---------------------------------------------------------------

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'warn';
}

export const toasts = signal<Toast[]>([]);
let nextToast = 1;

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 3400): void {
  const id = nextToast++;
  toasts.value = [...toasts.value, { id, text, kind }].slice(-4);
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), ms);
}
