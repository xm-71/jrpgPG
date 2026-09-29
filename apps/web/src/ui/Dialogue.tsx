import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { DialogueLine } from '@duskline/core';
import { heroById } from '@duskline/content';
import { sfx } from '../game/sfx';
import { heroUrl } from './Art';
import { Sky, type SkyVariant } from './Sky';

/** A story beat: narration in the middle of the screen, speech in a box under the speaker. */
export function Dialogue({ lines, title, onDone, sky = 'dusk' }: { lines: readonly DialogueLine[]; title?: string; onDone: () => void; sky?: SkyVariant }): JSX.Element {
  const [i, setI] = useState(0);
  const line = lines[i];
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
  if (!line) return <div class="screen" />;
  const hero = heroById(line.who);
  const narrator = line.who === 'narrator';
  return (
    <div class={`screen dialogue${narrator ? ' is-narration' : ''}`} onClick={next} role="button" tabIndex={0} aria-label="Continue">
      <Sky variant={sky} />
      {title && i === 0 && <p class="dlg-title label">{title}</p>}
      <button
        class="btn btn-small btn-ghost dlg-skip"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Skip
      </button>
      {hero && <img key={hero.id} class="dlg-portrait" src={heroUrl(hero, 'full')} alt="" draggable={false} />}
      {narrator ? (
        <p key={i} class="dlg-narration">
          {line.text}
        </p>
      ) : (
        <div key={i} class="dlg-box">
          <span class="dlg-name">{hero?.name ?? line.who}</span>
          <p>{line.text}</p>
        </div>
      )}
      <span class="dlg-more label">
        {i + 1} / {lines.length} · {last ? 'tap to go on' : 'tap'}
      </span>
    </div>
  );
}
