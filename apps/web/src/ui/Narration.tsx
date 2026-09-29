import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { sfx } from '../game/sfx';
import { Sky } from './Sky';

/** Full-screen story text over the sky: tap to move on. */
export function Narration({ lines, onDone, sky = 'dusk' }: { lines: string[]; onDone: () => void; sky?: 'dusk' | 'night' | 'noon' }): JSX.Element {
  const [i, setI] = useState(0);
  const last = i >= lines.length - 1;
  const next = (): void => {
    sfx.tap();
    if (last) onDone();
    else setI(i + 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  return (
    <div class="screen narration" onClick={next} role="button" tabIndex={0} aria-label="Continue">
      <Sky variant={sky} />
      <p key={i} class="narration-text pop">
        {lines[i]}
      </p>
      <div class="narration-foot label">
        <span>
          {i + 1} / {lines.length}
        </span>
        <span>{last ? 'Tap to begin' : 'Tap to continue'}</span>
      </div>
    </div>
  );
}
