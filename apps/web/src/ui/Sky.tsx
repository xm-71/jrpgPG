import type { JSX } from 'preact';

export type SkyVariant = 'dusk' | 'night' | 'noon' | 'tower';

const STARS: Array<[number, number, number]> = [
  [34, 60, 1.1], [80, 132, 0.8], [132, 40, 1.3], [190, 98, 0.7], [246, 52, 1], [300, 120, 0.8], [352, 70, 1.2], [372, 170, 0.7],
  [60, 220, 0.9], [150, 190, 0.6], [228, 230, 0.8], [330, 250, 0.9], [20, 300, 0.7], [270, 170, 0.6], [110, 280, 0.7],
];

const HORIZON = 600;

function Tower({ id }: { id: string }): JSX.Element {
  // The Gnomon: a black blade of a tower at the left edge, lit along one side by the stuck sun.
  // The lit edge fades out upward so it never cuts through text.
  return (
    <g>
      <defs>
        <linearGradient id={`edge-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2={HORIZON}>
          <stop offset="0" stop-color="#c8322c" stop-opacity="0" />
          <stop offset=".55" stop-color="#c8322c" stop-opacity=".25" />
          <stop offset="1" stop-color="#e25a45" stop-opacity=".85" />
        </linearGradient>
      </defs>
      <path d={`M-40 ${HORIZON + 40} L52 ${HORIZON} L84 ${HORIZON + 3} L-20 ${HORIZON + 200} L-40 ${HORIZON + 200} Z`} fill="#000" opacity=".45" />
      <path d={`M52 ${HORIZON} L66 90 L72 80 L84 ${HORIZON} Z`} fill="#050408" />
      <path d={`M72 80 L84 ${HORIZON}`} stroke={`url(#edge-${id})`} stroke-width="1.6" />
      <path d="M61 250 L76 250 M58 380 L79 380 M55 500 L82 500" stroke="#c8322c" stroke-width="1" opacity=".22" />
      <circle cx="69" cy="170" r="2.4" fill="#d9a441" opacity=".8" />
    </g>
  );
}

/** The sea under the stuck sun: a column of broken reflections that fades toward the viewer. */
function Sea({ color, strength }: { color: string; strength: number }): JSX.Element {
  const lines = Array.from({ length: 7 }, (_, i) => {
    const y = HORIZON + 6 + i * 8 + i * i * 1.1;
    const half = 40 - i * 4;
    const jitter = ((i * 37) % 11) - 5;
    return <path key={i} d={`M${300 - half + jitter} ${y} L${300 + half + jitter} ${y}`} stroke={color} stroke-width={1 + i * 0.2} stroke-linecap="round" opacity={(0.5 - i * 0.065) * strength} />;
  });
  return (
    <g>
      {lines}
      {[640, 690, 750].map((y, i) => (
        <path key={y} d={`M0 ${y} L400 ${y}`} stroke="#ece6d8" stroke-width=".5" opacity={0.05 - i * 0.012} />
      ))}
    </g>
  );
}

function Sundial({ cy, r, opacity }: { cy: number; r: number; opacity: number }): JSX.Element {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return (
      <line
        key={i}
        x1={200 + Math.cos(a) * (r - 14)}
        y1={cy + Math.sin(a) * (r - 14)}
        x2={200 + Math.cos(a) * r}
        y2={cy + Math.sin(a) * r}
        stroke="#ece6d8"
        stroke-width={i % 3 === 0 ? 1.4 : 0.7}
      />
    );
  });
  return (
    <g class="sky-drift" opacity={opacity} fill="none">
      <circle cx="200" cy={cy} r={r} stroke="#ece6d8" stroke-width="0.8" />
      <circle cx="200" cy={cy} r={r - 24} stroke="#ece6d8" stroke-width="0.5" stroke-dasharray="2 6" />
      {ticks}
    </g>
  );
}

/** The world's light: a sun stuck on the horizon and the tower that pins it. */
export function Sky({ variant = 'dusk' }: { variant?: SkyVariant }): JSX.Element {
  if (variant === 'tower') {
    return (
      <div class="sky sky-tower" aria-hidden="true">
        <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="tw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#050409" />
              <stop offset=".55" stop-color="#130d19" />
              <stop offset="1" stop-color="#2a0f13" />
            </linearGradient>
            <radialGradient id="tw-floor" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#c8322c" stop-opacity=".35" />
              <stop offset="1" stop-color="#c8322c" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="800" fill="url(#tw)" />
          {[40, 140, 260, 360].map((x) => (
            <g key={x} opacity=".75">
              <rect x={x - 16} y="0" width="32" height="560" fill="#08060c" />
              <path d={`M${x - 16} 120 Q${x} 90 ${x + 16} 120`} stroke="#ece6d8" stroke-width=".6" opacity=".25" fill="none" />
            </g>
          ))}
          <path d="M0 250 L400 250" stroke="#ece6d8" stroke-width=".4" opacity=".12" />
          <path d="M70 0 L150 560 M330 0 L250 560" stroke="#d9a441" stroke-width="30" opacity=".03" />
          <ellipse cx="200" cy="600" rx="230" ry="70" fill="url(#tw-floor)" />
          <g transform="translate(200 600) scale(1 0.3)" fill="none" stroke="#c8322c" opacity=".5">
            <circle r="200" stroke-width="2" />
            <circle r="150" stroke-width="1" stroke-dasharray="4 8" />
            <path d="M0 -200 L173 100 L-173 100 Z M0 200 L-173 -100 L173 -100 Z" stroke-width="1" />
          </g>
          <rect y="560" width="400" height="240" fill="#050408" opacity=".4" />
        </svg>
      </div>
    );
  }
  const night = variant === 'night';
  const noon = variant === 'noon';
  const top = night ? '#04040a' : '#060409';
  const mid = night ? '#0c1020' : noon ? '#2a0f14' : '#160d19';
  const low = night ? '#10233a' : noon ? '#a8301f' : '#5c1a1c';
  const sun = night ? '#8fa0c0' : '#f0b060';
  return (
    <div class={`sky sky-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={`sk-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={top} />
            <stop offset=".55" stop-color={mid} />
            <stop offset=".75" stop-color={low} />
          </linearGradient>
          <radialGradient id={`sun-${variant}`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#fff1d0" />
            <stop offset=".45" stop-color={sun} />
            <stop offset="1" stop-color="#c8322c" />
          </radialGradient>
          <linearGradient id={`sea-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={night ? '#0a0f1a' : noon ? '#1c0a0c' : '#120a10'} />
            <stop offset="1" stop-color="#0d0b13" />
          </linearGradient>
          <radialGradient id={`glow-${variant}`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color={night ? '#5a7ab0' : '#e25a45'} stop-opacity=".45" />
            <stop offset="1" stop-color="#000" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="800" fill={`url(#sk-${variant})`} />
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#ece6d8" opacity={night ? 0.8 : 0.45} />
        ))}
        <Sundial cy={HORIZON} r={330} opacity={night ? 0.1 : 0.14} />
        <circle cx="300" cy={HORIZON - 18} r="140" fill={`url(#glow-${variant})`} />
        <circle cx="300" cy={HORIZON - 18} r="34" fill={`url(#sun-${variant})`} />
        {night && <circle cx="312" cy={HORIZON - 26} r="31" fill="#06060d" />}
        <rect y={HORIZON} width="400" height={800 - HORIZON} fill={`url(#sea-${variant})`} />
        <Sea color={night ? '#8fa0c0' : '#f0a060'} strength={night ? 0.25 : noon ? 1 : 0.8} />
        <Tower id={variant} />
        <path d={`M232 ${HORIZON - 12} L372 ${HORIZON - 16} L368 ${HORIZON - 4} L236 ${HORIZON - 2} Z`} fill="#050408" />
        <path d={`M252 ${HORIZON - 12} L246 ${HORIZON + 14} M290 ${HORIZON - 13} L286 ${HORIZON + 12} M332 ${HORIZON - 15} L338 ${HORIZON + 10} M358 ${HORIZON - 15} L366 ${HORIZON + 8}`} stroke="#050408" stroke-width="4" stroke-linecap="round" />
        <rect x="262" y={HORIZON - 30} width="12" height="18" fill="#050408" />
        <rect x="300" y={HORIZON - 40} width="6" height="28" fill="#050408" />
        <circle cx="303" cy={HORIZON - 32} r="1.6" fill="#d9a441" />
        <path d={`M0 ${HORIZON} L400 ${HORIZON}`} stroke={night ? '#6f86a8' : '#e25a45'} stroke-width="1" opacity=".6" />
      </svg>
    </div>
  );
}
