import { signal } from '@preact/signals';

export type Screen =
  | { name: 'title' }
  | { name: 'home' }
  | { name: 'scene' }
  | { name: 'climb' }
  | { name: 'climb-new'; daily?: boolean }
  | { name: 'chronicle' }
  | { name: 'kindling' }
  | { name: 'odds'; banner: string }
  | { name: 'history' }
  | { name: 'roster'; hero?: string }
  | { name: 'settings' };

export const screen = signal<Screen>({ name: 'title' });

/**
 * A screen can ask to intercept "back", for example a battle that wants to confirm giving up.
 * Return true when the back press was handled.
 */
export const backGuard = signal<(() => boolean) | null>(null);

let ready = false;

export function go(next: Screen, opts: { replace?: boolean } = {}): void {
  backGuard.value = null;
  screen.value = next;
  if (!ready) return;
  const state = { screen: next };
  if (opts.replace) history.replaceState(state, '');
  else history.pushState(state, '');
}

/** Wire the browser and phone back button to the game's screens. */
export function startNavigation(initial: Screen): void {
  ready = true;
  screen.value = initial;
  history.replaceState({ screen: initial }, '');
  addEventListener('popstate', (e) => {
    const guard = backGuard.value;
    if (guard && guard()) {
      history.pushState({ screen: screen.value }, '');
      return;
    }
    const target = (e.state as { screen?: Screen } | null)?.screen;
    backGuard.value = null;
    screen.value = target ?? { name: 'home' };
  });
}

export function back(): void {
  history.back();
}
