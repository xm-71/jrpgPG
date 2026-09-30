import { normalizeProfile, newProfile, type Profile } from '@duskline/core';
import { STARTER_HEROES } from '@duskline/content';

const KEY = 'duskline:profile';
const BACKUP = 'duskline:profile:damaged';

/** localStorage can be missing, full or blocked. When it is, the game still runs, just without saving. */
const memory = new Map<string, string>();
let persistent = true;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    persistent = false;
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    persistent = false;
    memory.set(key, value);
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    persistent = false;
  }
  memory.delete(key);
}

export interface Loaded {
  profile: Profile;
  /** No save existed. */
  fresh: boolean;
  /** A save existed but could not be read; it was set aside. */
  recovered: boolean;
  persistent: boolean;
}

export function loadProfile(now: number): Loaded {
  const raw = read(KEY);
  if (raw === null) return { profile: newProfile(now, STARTER_HEROES), fresh: true, recovered: false, persistent };
  try {
    const p = normalizeProfile(JSON.parse(raw), now, STARTER_HEROES);
    if (p) return { profile: p, fresh: false, recovered: false, persistent };
  } catch {
    // fall through to recovery
  }
  write(BACKUP, raw);
  return { profile: newProfile(now, STARTER_HEROES), fresh: true, recovered: true, persistent };
}

export function saveProfile(p: Profile): void {
  write(KEY, JSON.stringify(p));
}

export function eraseProfile(): void {
  remove(KEY);
}

export const isPersistent = (): boolean => persistent;

export function exportProfile(p: Profile): string {
  return JSON.stringify(p);
}

/** Parse pasted save text. Returns null when it is not a Duskline save. */
export function importProfile(text: string, now: number): Profile | null {
  try {
    return normalizeProfile(JSON.parse(text), now, STARTER_HEROES);
  } catch {
    return null;
  }
}
