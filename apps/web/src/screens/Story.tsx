import type { JSX } from 'preact';
import { STAGES } from '@duskline/content';
import { back, go } from '../game/nav';
import { sfx } from '../game/sfx';
import { profile } from '../game/store';
import { GloamIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';

export function Story(): JSX.Element {
  const p = profile.value;
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Story</h1>
      </header>
      <div class="body scroll story-list">
        {STAGES.map((s, i) => {
          const clears = p.progress.cleared[s.id] ?? 0;
          const open = i === 0 || (p.progress.cleared[STAGES[i - 1]!.id] ?? 0) > 0;
          const isNew = open && clears === 0;
          return (
            <button
              key={s.id}
              class={`stage-row panel${open ? '' : ' locked'}${isNew ? ' fresh' : ''}`}
              disabled={!open}
              onClick={() => {
                sfx.tap();
                go({ name: 'stage', id: s.id });
              }}
            >
              <span class="stage-num display">{s.id}</span>
              <span class="stage-info">
                <span class="stage-name">{open ? s.name : 'Locked'}</span>
                <span class="muted stage-blurb">{open ? s.blurb : `Clear ${STAGES[i - 1]?.id ?? ''} first`}</span>
              </span>
              <span class="stage-side">
                {clears > 0 ? (
                  <span class="chip chip-gold">Cleared</span>
                ) : open ? (
                  <span class="gloam">
                    <GloamIcon />
                    {s.firstClearGloam}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
