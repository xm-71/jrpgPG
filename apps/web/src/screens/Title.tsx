import type { JSX } from 'preact';
import { BLOOD, BONE } from '../art/palette';
import { sigil } from '../art/sigil';
import { afterward } from '../game/flow';
import { go } from '../game/nav';
import { canAddToHome, canInstall, installed, needsShareSheet, promptInstall } from '../game/offline';
import { sfx } from '../game/sfx';
import { isFreshSave, profile, recoveredSave, savingWorks } from '../game/store';
import { showAddToHome } from '../ui/AddToHome';
import { Sky } from '../ui/Sky';

export function Title(): JSX.Element {
  const p = profile.value;
  const started = !isFreshSave.value || p.progress.beats.length > 0 || p.climb.runs > 0;

  return (
    <div class="screen title">
      <Sky variant="dusk" />
      <div class="title-logo">
        <svg class="title-seal" viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sigil('duskline-title', BONE, { hour: 12, numerals: true, weight: 0.8 }) }} />
        <p class="label title-kicker">The Gnomon</p>
        <h1 class="display title-name">DUSKLINE</h1>
        <p class="title-kana" lang="ja" aria-hidden="true">
          ダスクライン
        </p>
        <p class="title-line">A tower that pins the sun. A hand of three cards. Climb.</p>
      </div>
      <div class="title-actions">
        {started ? (
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              sfx.tap();
              if (p.climb.run) go({ name: 'climb' });
              else afterward(p);
            }}
          >
            {p.climb.run ? 'Resume the climb' : 'Continue'}
          </button>
        ) : (
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              sfx.tap();
              isFreshSave.value = false;
              go({ name: 'scene' });
            }}
          >
            Begin
          </button>
        )}
        {canInstall.value && !installed.value && (
          <button
            class="btn btn-ghost btn-block"
            onClick={() => {
              sfx.tap();
              void promptInstall();
            }}
          >
            Install to play offline
          </button>
        )}
        {canAddToHome() && (
          <button
            class="btn btn-ghost btn-block"
            onClick={() => {
              sfx.tap();
              void showAddToHome();
            }}
          >
            Add to Home Screen
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
        {installed.value && needsShareSheet() && !started && <p class="pill-note">Played in Safari before? Progress there stays there. In Settings, Paste a save brings it here.</p>}
        {recoveredSave.value && <p class="pill-note">Your last save could not be read, so a new game was started. The old data is kept aside in this browser.</p>}
        {!savingWorks.value && <p class="pill-note">This browser is blocking storage, so progress will not be saved after you close the page.</p>}
        <p class="label title-foot" style={{ color: BLOOD }}>
          No purchases. Every pull is earned.
        </p>
      </div>
    </div>
  );
}
