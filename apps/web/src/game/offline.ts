import { signal } from '@preact/signals';
import { toast } from './store';

/**
 * Offline play. The production site registers a service worker (offline/sw.js) that keeps every file of
 * the game on the device, so it opens with no connection, and can be installed like an app. This module
 * registers it, tracks its state for Settings, offers a new version when one is waiting, and holds on
 * to the browser's install prompt.
 */

export type OfflineState =
  /** No service worker here: the single-file copy, a browser that lacks them, or a page that is not on http(s). */
  | 'unsupported'
  /** First visit: the files are still being saved. */
  | 'preparing'
  /** Everything is saved; the game opens offline. */
  | 'ready'
  /** The files could not be saved (storage full or blocked). */
  | 'failed';

export const offlineState = signal<OfflineState>('unsupported');
/** A newer version has been downloaded and is waiting for the player to restart into it. */
export const updateReady = signal(false);
/** The version of the files being served, once the worker has said. */
export const cacheVersion = signal<string | null>(null);
/** The browser has offered its install prompt and it has not been used. */
export const canInstall = signal(false);
export const installed = signal(isStandalone());
export const persisted = signal(false);
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

const TOLD_KEY = 'duskline:offline-told';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstall: InstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | null = null;
let applying = false;
let lastCheck = Date.now();

/** Running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhones and iPads install from Safari's Share sheet; there is no install prompt to trigger. */
export function needsShareSheet(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function said(): boolean {
  try {
    return localStorage.getItem(TOLD_KEY) === '1';
  } catch {
    return true;
  }
}

function markSaid(): void {
  try {
    localStorage.setItem(TOLD_KEY, '1');
  } catch {
    /* Not remembering is fine: the toast just shows again next launch. */
  }
}

function askForVersion(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'VERSION' });
}

/** Watch a worker that is installing: it becomes an update to offer, or it fails. */
function watch(worker: ServiceWorker): void {
  const settle = (): void => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      updateReady.value = true;
      toast('A new version of Duskline is ready. Update it in Settings.', 'good', 6000);
    } else if (worker.state === 'redundant' && offlineState.value === 'preparing') {
      offlineState.value = 'failed';
    }
  };
  worker.addEventListener('statechange', settle);
  settle();
}

function ready(): void {
  offlineState.value = 'ready';
  askForVersion();
  navigator.storage?.persist?.().then(
    (granted) => (persisted.value = granted),
    () => undefined,
  );
  if (!said()) {
    markSaid();
    toast('Duskline is saved on this device and works offline.', 'good', 5000);
  }
}

/** Ask the browser to look for a newer version, at most every half hour, when the game comes back to the front. */
function checkOnReturn(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !registration || Date.now() - lastCheck < 30 * 60_000) return;
    lastCheck = Date.now();
    registration.update().catch(() => undefined);
  });
}

function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event as InstallPromptEvent;
    canInstall.value = true;
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    canInstall.value = false;
    installed.value = true;
    toast('Duskline is installed.', 'good');
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => (installed.value = e.matches));
}

/** Show the browser's install dialog. Only works after a tap, and only when `canInstall` is set. */
export async function promptInstall(): Promise<void> {
  const event = deferredInstall;
  if (!event) return;
  deferredInstall = null;
  canInstall.value = false;
  await event.prompt();
  await event.userChoice.catch(() => undefined);
}

/** Restart into the new version. The waiting worker takes over, and the page reloads once it has. */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) {
    location.reload();
    return;
  }
  applying = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

/** Call once at start-up. Does nothing in development or in the single-file copy. */
export function startOffline(): void {
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
  if (__SINGLE_FILE__ || !import.meta.env.PROD) return;
  listenForInstall();
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;

  offlineState.value = 'preparing';
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type?: string; version?: string }>) => {
    if (event.data?.type === 'VERSION' && event.data.version) cacheVersion.value = event.data.version;
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) location.reload();
    else askForVersion();
  });
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((reg) => {
      registration = reg;
      if (reg.installing) watch(reg.installing);
      if (reg.waiting && navigator.serviceWorker.controller) updateReady.value = true;
      reg.addEventListener('updatefound', () => reg.installing && watch(reg.installing));
      checkOnReturn();
      void navigator.serviceWorker.ready.then(ready);
    })
    .catch(() => {
      offlineState.value = 'failed';
    });
}
