import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { DialogueLine } from '@duskline/core';
import { heroById } from '@duskline/content';
import { sfx } from '../game/sfx';
import { heroUrl } from './Art';
import { Sky } from './Sky';

/** A visual-novel beat: the speaker's portrait rises from the ground, the line sits in a slanted box. */
export function Dialogue({ lines, onDone, sky = 'dusk' }: { lines: readonly DialogueLine[]; onDone: () => void; sky?: 'dusk' | 'night' | 'noon' }): JSX.Element {
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
  if (!line) {
    onDone();
    return <div class="screen" />;
  }
  const hero = heroById(line.who);
  const narrator = line.who === 'narrator';
  return (
    <div class="screen dialogue" onClick={next} role="button" tabIndex={0} aria-label="Continue">
      <Sky variant={sky} />
      <button
        class="btn btn-small btn-ghost dlg-skip"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Skip
      </button>
      {hero && <img key={hero.id} class="dlg-portrait pop" src={heroUrl(hero, 'half')} alt="" draggable={false} />}
      <div key={i} class={`dlg-box pop${narrator ? ' narrator' : ''}`}>
        {!narrator && <span class="dlg-name display">{hero?.name ?? line.who}</span>}
        <p lang="en">{line.text}</p>
        <span class="dlg-more label">
          {i + 1}/{lines.length} {last ? '· tap to go on' : '▸'}
        </span>
      </div>
    </div>
  );
}
