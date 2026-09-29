import type { Affinity, StatusId } from '@duskline/core';
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
export function AffinityTag({ a }: { a: Affinity }): JSX.Element {
  return (
    <span class={`aff-tag aff-${a}`}>
      <AffinityIcon a={a} size={11} />
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
      <path d="M8 4.5 11 8 8 11.5 5 8Z" fill="#1a1206" opacity=".4" />
    </svg>
  );
}

export function EmberIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5c.8 2.6 4 4 4 7.4A4 4 0 0 1 4 8.9c0-2 1.3-2.8 2-4.7.7.6 1.3 1.4 1.4 2.2.8-1.3.9-3.2.6-4.9Z" fill="currentColor" />
    </svg>
  );
}

export function BladeIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M2.5 13.5 11 5l1-3.5L8.5 2.5 0 11l2.5 2.5Z M3.5 9.5l3 3M1.5 14.5l2-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M8 1.2 13.6 3c0 5.2-2 8.6-5.6 11.8C4.4 11.6 2.4 8.2 2.4 3L8 1.2Z" fill="currentColor" opacity=".2" />
      <path d="M8 1.2 13.6 3c0 5.2-2 8.6-5.6 11.8C4.4 11.6 2.4 8.2 2.4 3L8 1.2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
  );
}

/** A lamp for each point of Light. */
export function LightPip({ on }: { on: boolean }): JSX.Element {
  return (
    <svg viewBox="0 0 12 16" class={`light-pip${on ? ' on' : ''}`} aria-hidden="true">
      <path d="M6 1 11 8 6 15 1 8Z" />
    </svg>
  );
}

const statusShapes: Record<StatusId, JSX.Element> = {
  burn: <path d="M8 1.5c.8 2.6 4 4 4 7.4A4 4 0 0 1 4 8.9c0-2 1.3-2.8 2-4.7.7.6 1.3 1.4 1.4 2.2.8-1.3.9-3.2.6-4.9Z" />,
  chill: <path d="M8 1v14M2 4.5l12 7M14 4.5l-12 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />,
  hex: <path d="M8 2.5 13.2 11.5H2.8Z M8 6.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" fill-rule="evenodd" />,
  shock: <path d="M9 1 3.5 9h4L6.5 15l6-8.5H8.3Z" />,
  rage: <path d="M2 13 5 4l3 5 3-7 3 11Z" />,
  dim: <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 1 8 2Z" />,
};

export function StatusIcon({ s, size = 12 }: { s: StatusId; size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} class={`st-ico st-${s}`} fill="currentColor" aria-hidden="true">
      {statusShapes[s]}
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
