import { isStandalone } from './offline';

/**
 * Touch behaviour that only makes sense once the game is an installed app, where it should not act
 * like a web page.
 *
 * `data-standalone` on the page lets the styles drop text selection and the long-press menu. On iOS a
 * two-finger pinch would zoom the fixed layout and strand it there (Safari ignores `user-scalable=no`),
 * so the pinch is cancelled where it starts. In a browser tab nothing changes, and the game has its
 * own text size setting for anyone who needs larger type.
 */
export function startTouchGuards(): void {
  const tag = (): void => {
    document.documentElement.toggleAttribute('data-standalone', isStandalone());
  };
  tag();
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', tag);
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(
      type,
      (event) => {
        if (isStandalone()) event.preventDefault();
      },
      { passive: false },
    );
  }
}
