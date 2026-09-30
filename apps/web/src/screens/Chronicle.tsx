import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { BeatDef } from '@duskline/core';
import { BEATS, STRATA } from '@duskline/content';
import { back } from '../game/nav';
import { sfx } from '../game/sfx';
import { profile } from '../game/store';
import { Dialogue } from '../ui/Dialogue';
import { Sky } from '../ui/Sky';

function hint(b: BeatDef): string {
  const t = b.trigger;
  switch (t.type) {
    case 'start':
      return 'Begin the game';
    case 'firstClimbEnd':
      return 'Finish your first climb';
    case 'reachFloor':
      return `Reach floor ${t.floor + 1} of ${STRATA[t.stratum]?.name ?? 'the tower'}`;
    case 'clearStratum':
      return `Clear ${STRATA[t.stratum]?.name ?? 'the tower'}`;
  }
}

const CHAPTER = ['Prologue', 'I. The Root', 'II. The Hollow', 'III. The Crown'];

/** Every story scene, to read again. */
export function Chronicle(): JSX.Element {
  const [playing, setPlaying] = useState<BeatDef | null>(null);
  const seen = new Set(profile.value.progress.beats);
  if (playing) return <Dialogue title={playing.title} lines={playing.lines} sky={playing.sky ?? 'dusk'} onDone={() => setPlaying(null)} />;
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1>Chronicle</h1>
      </header>
      <div class="body scroll chronicle">
        {BEATS.map((b, i) => {
          const open = seen.has(b.id);
          const chapterStart = i === 0 || BEATS[i - 1]!.chapter !== b.chapter;
          return (
            <div key={b.id}>
              {chapterStart && <p class="label chronicle-ch">{CHAPTER[b.chapter] ?? `Chapter ${b.chapter}`}</p>}
              <button
                class={`chronicle-row panel${open ? '' : ' locked'}`}
                disabled={!open}
                onClick={() => {
                  sfx.tap();
                  setPlaying(b);
                }}
              >
                <span class="chronicle-title">{open ? b.title : 'Unwritten'}</span>
                <span class="muted small">{open ? `${b.lines.length} lines · tap to read again` : hint(b)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
