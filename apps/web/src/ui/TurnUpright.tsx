import type { JSX } from 'preact';

/** A cover for a phone held sideways. It is always in the page and only shown by the styles (`.turn-upright`). */
export function TurnUpright(): JSX.Element {
  return (
    <div class="turn-upright" role="alert">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="14" y="4" width="20" height="40" rx="4" />
        <path d="M21 8h6" />
      </svg>
      <p class="display">Turn your phone upright</p>
      <p class="muted">Duskline is played in portrait.</p>
    </div>
  );
}
