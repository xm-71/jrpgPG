import type { JSX } from 'preact';

/** The world's light: a sun stuck on the horizon and a walking city against it. */
export function Sky({ variant = 'dusk' }: { variant?: 'dusk' | 'night' | 'noon' }): JSX.Element {
  return (
    <div class={`sky${variant === 'night' ? ' sky-night' : variant === 'noon' ? ' sky-noon' : ''}`} aria-hidden="true">
      <div class="sky-stars" />
      <div class="sky-sun" />
      <svg class="sky-city" viewBox="0 0 300 130" fill="#110e26">
        <path d="M40 66 L250 56 L244 74 L46 80Z" />
        <rect x="72" y="36" width="18" height="30" />
        <rect x="118" y="14" width="10" height="46" />
        <path d="M118 14 L123 2 L128 14Z" />
        <rect x="160" y="30" width="26" height="28" />
        <rect x="204" y="42" width="12" height="16" />
        <path d="M56 78 L44 118 M92 78 L86 116 M198 74 L206 112 M236 72 L252 108" stroke="#110e26" stroke-width="7" stroke-linecap="round" fill="none" />
        <g fill="#f2b43a">
          <circle cx="80" cy="50" r="2.2" />
          <circle cx="123" cy="30" r="2" />
          <circle cx="172" cy="44" r="2.2" />
        </g>
      </svg>
      <div class="sky-ground" />
    </div>
  );
}
