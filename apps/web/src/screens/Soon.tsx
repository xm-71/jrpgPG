import type { JSX } from 'preact';
import { back } from '../game/nav';

/** Placeholder while a screen is being built. */
export function Soon({ name }: { name: string }): JSX.Element {
  return (
    <div class="screen">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">{name}</h1>
      </header>
      <div class="body">
        <p class="muted">Coming up next.</p>
      </div>
    </div>
  );
}
