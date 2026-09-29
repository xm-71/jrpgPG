import type { JSX } from 'preact';
import { toasts } from '../game/store';

export function Toasts(): JSX.Element {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
