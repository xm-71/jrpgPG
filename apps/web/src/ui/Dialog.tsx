import { signal } from '@preact/signals';
import type { ComponentChildren, JSX } from 'preact';

interface Ask {
  title: string;
  body: ComponentChildren;
  confirm: string;
  cancel: string | null;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

const current = signal<Ask | null>(null);

/**
 * An in-page confirmation. The game never uses window.confirm, which sandboxed and embedded
 * pages silently answer "no" to.
 */
export function ask(o: { title: string; body: ComponentChildren; confirm?: string; cancel?: string | null; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    current.value = {
      title: o.title,
      body: o.body,
      confirm: o.confirm ?? 'OK',
      cancel: o.cancel === undefined ? 'Cancel' : o.cancel,
      danger: o.danger ?? false,
      resolve,
    };
  });
}

export function DialogHost(): JSX.Element | null {
  const a = current.value;
  if (!a) return null;
  const close = (ok: boolean): void => {
    current.value = null;
    a.resolve(ok);
  };
  return (
    <div class="overlay center" role="dialog" aria-modal="true" aria-label={a.title}>
      <div class="sheet panel">
        <h2 class="display">{a.title}</h2>
        <div class="muted">{a.body}</div>
        <div class="row">
          {a.cancel !== null && (
            <button class="btn btn-ghost grow" onClick={() => close(false)}>
              {a.cancel}
            </button>
          )}
          <button class={`btn ${a.danger ? 'btn-primary' : 'btn-gold'} grow`} onClick={() => close(true)}>
            {a.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
