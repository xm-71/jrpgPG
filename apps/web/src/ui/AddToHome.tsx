import type { JSX } from 'preact';
import { ask } from './Dialog';

function ShareGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Share">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

/**
 * How to put Duskline on an iPhone or iPad Home Screen. iOS has no install prompt a page can trigger,
 * so the game explains the steps itself.
 */
export function AddToHomeSteps(): JSX.Element {
  return (
    <ol class="steps">
      <li>
        Tap the Share button <ShareGlyph /> in your browser's toolbar.
      </li>
      <li>
        Choose <strong>Add to Home Screen</strong>. If it asks about opening as a web app, leave that on.
      </li>
      <li>
        Tap <strong>Add</strong>. Then open Duskline from your Home Screen once while you are online, and it keeps itself on the device for offline play.
      </li>
    </ol>
  );
}

/** The same steps as a dialog, for the title screen. */
export function showAddToHome(): Promise<boolean> {
  return ask({
    title: 'Add to Home Screen',
    body: (
      <>
        <AddToHomeSteps />
        <p class="small steps-note">The Home Screen app keeps its own save, apart from this page. To bring your progress across, tap Copy save in Settings first, then Paste a save in the app.</p>
      </>
    ),
    confirm: 'Got it',
    cancel: null,
  });
}
