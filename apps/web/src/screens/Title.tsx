import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { STAGES } from '@duskline/content';
import { go } from '../game/nav';
import { sfx } from '../game/sfx';
import { isFreshSave, mutate, profile, recoveredSave, savingWorks } from '../game/store';
import { Narration } from '../ui/Narration';
import { Sky } from '../ui/Sky';

const PROLOGUE = [
  'A thousand years ago, the world of Hesper stopped turning.',
  'One half burns under a noon that never ends. The other freezes under endless night.',
  'Between them runs the Duskline, a ring of permanent sunset.',
  'There, cities on colossal legs keep walking, to stay in the light.',
  'You are a Lamplighter on the oldest of them. Tonight, something is crawling along the rail.',
];

export function Title(): JSX.Element {
  const [prologue, setPrologue] = useState(false);
  const p = profile.value;
  const started = !isFreshSave.value || Object.keys(p.progress.cleared).length > 0;

  if (prologue) {
    return (
      <Narration
        lines={PROLOGUE}
        onDone={() => {
          mutate((x) => void (x.progress.flags['seenPrologue'] = true));
          isFreshSave.value = false;
          go({ name: 'stage', id: STAGES[0]!.id });
        }}
      />
    );
  }

  return (
    <div class="screen title">
      <Sky />
      <div class="title-logo">
        <p class="label title-kicker">A JRPG of endless sunset</p>
        <h1 class="display title-name">Duskline</h1>
        <p class="title-kana" lang="ja" aria-hidden="true">
          ダスクライン
        </p>
      </div>
      <div class="title-actions">
        {started ? (
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              sfx.tap();
              go({ name: 'home' });
            }}
          >
            Continue
          </button>
        ) : (
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              sfx.tap();
              setPrologue(true);
            }}
          >
            Begin
          </button>
        )}
        <button
          class="btn btn-ghost btn-block"
          onClick={() => {
            sfx.tap();
            go({ name: 'settings' });
          }}
        >
          Settings
        </button>
        {recoveredSave.value && <p class="pill-note">Your last save could not be read, so a new game was started. The old data is kept aside in this browser.</p>}
        {!savingWorks.value && <p class="pill-note">This browser is blocking storage, so progress will not be saved after you close the page.</p>}
        <p class="label title-foot">Working title · early build</p>
      </div>
    </div>
  );
}
