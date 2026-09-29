import type { Affinity } from '@duskline/core';
import type { JSX } from 'preact';

const shapes: Record<Affinity, JSX.Element> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.6" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" fill="none" stroke-width="2.2" stroke-linecap="round" />
    </>
  ),
  moon: <path d="M18.5 15A8 8 0 0 1 9 5.5a8 8 0 1 0 9.5 9.5Z" stroke="none" />,
  flame: <path d="M12 2c1.2 4.2 6.2 6.2 6.2 12a6.2 6.2 0 0 1-12.4 0c0-3.2 2-4.4 3.2-7.4 1 1 2 2.2 2.2 3.4 1.2-2 1.4-5 .8-8Z" stroke="none" />,
  frost: <path d="M12 2v20M4 7l16 10M20 7 4 17M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />,
  gale: <path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" fill="none" stroke-width="2.2" stroke-linecap="round" />,
  volt: <path d="M13.5 2 5 13.5h6L10 22l9-12h-6.2l.7-8Z" stroke="none" />,
};

export const AFFINITY_LABEL: Record<Affinity, string> = {
  sun: 'Sun',
  moon: 'Moon',
  flame: 'Flame',
  frost: 'Frost',
  gale: 'Gale',
  volt: 'Volt',
};

export function AffinityIcon({ a, size = 16 }: { a: Affinity; size?: number }): JSX.Element {
  return (
    <span class={`aff aff-${a}`} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      <svg viewBox="0 0 24 24">{shapes[a]}</svg>
    </span>
  );
}

/** Weakness and affinity tags always carry the word as well as the colour and shape. */
export function AffinityTag({ a, hit = false }: { a: Affinity; hit?: boolean }): JSX.Element {
  return (
    <span class={`aff-tag aff-${a}${hit ? ' hit' : ''}`}>
      <AffinityIcon a={a} size={12} />
      {AFFINITY_LABEL[a]}
    </span>
  );
}

export function Stars({ n }: { n: number }): JSX.Element {
  return (
    <span class={`stars r${n}`} role="img" aria-label={`${n} star`}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 .8 7.5 4.2l3.7.4-2.8 2.5.8 3.6L6 8.8 2.8 10.7l.8-3.6L.8 4.6l3.7-.4Z" />
        </svg>
      ))}
    </span>
  );
}

export function GloamIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1 14 8 8 15 2 8Z" fill="currentColor" />
      <path d="M8 4.5 11 8 8 11.5 5 8Z" fill="#241a05" opacity=".35" />
    </svg>
  );
}

export const ROLE_LABEL: Record<string, string> = {
  striker: 'Striker',
  breaker: 'Breaker',
  defender: 'Defender',
  support: 'Support',
  debuffer: 'Debuffer',
  healer: 'Healer',
  burst: 'Burst',
};
