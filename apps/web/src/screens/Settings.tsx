import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { newProfile } from '@duskline/core';
import { STARTER_HEROES } from '@duskline/content';
import { now } from '../game/clock';
import { back } from '../game/nav';
import { exportProfile, importProfile } from '../game/persist';
import { sfx } from '../game/sfx';
import { isFreshSave, mutate, profile, replaceProfile, resetProfile, savingWorks, toast } from '../game/store';
import { ask } from '../ui/Dialog';
import { Sky } from '../ui/Sky';

const SIZES = [
  { label: 'Normal', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Larger', value: 1.3 },
];

export function Settings(): JSX.Element {
  const p = profile.value;
  const s = p.settings;
  const [text, setText] = useState('');
  const [shown, setShown] = useState(false);

  const copy = async (): Promise<void> => {
    const data = exportProfile(profile.value);
    try {
      await navigator.clipboard.writeText(data);
      toast('Save copied.', 'good');
    } catch {
      setText(data);
      setShown(true);
      toast('Copying was blocked. Select the text below instead.', 'warn');
    }
  };

  const load = async (): Promise<void> => {
    const parsed = importProfile(text.trim(), now());
    if (!parsed) {
      toast('That does not look like a Duskline save.', 'warn');
      return;
    }
    const ok = await ask({ title: 'Load this save?', body: 'It replaces the game on this device. Export first if you want to keep the current one.', confirm: 'Load save', danger: true });
    if (!ok) return;
    replaceProfile(parsed);
    isFreshSave.value = false;
    toast('Save loaded.', 'good');
  };

  const reset = async (): Promise<void> => {
    const ok = await ask({ title: 'Erase everything?', body: 'This deletes your heroes, cards, Gloam and story progress on this device. It cannot be undone.', confirm: 'Erase', danger: true });
    if (!ok) return;
    resetProfile(newProfile(now(), STARTER_HEROES));
    isFreshSave.value = true;
    toast('Started a new game.', 'good');
    back();
  };

  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Settings</h1>
      </header>
      <div class="body scroll">
        <section class="panel panel-pad">
          <label class="switch">
            <span>
              <strong>Reduce motion</strong>
              <br />
              <span class="muted small">Softer effects, no screen shake. Also follows your device setting.</span>
            </span>
            <input type="checkbox" checked={s.reducedMotion} onChange={(e) => mutate((x) => void (x.settings.reducedMotion = e.currentTarget.checked))} />
          </label>
          <label class="switch">
            <span>
              <strong>Sound</strong>
              <br />
              <span class="muted small">Short synthesised effects.</span>
            </span>
            <input
              type="checkbox"
              checked={s.sound}
              onChange={(e) => {
                mutate((x) => void (x.settings.sound = e.currentTarget.checked));
                if (e.currentTarget.checked) sfx.win();
              }}
            />
          </label>
          <div class="switch">
            <strong>Text size</strong>
            <div class="tabs seg" role="group" aria-label="Text size">
              {SIZES.map((z) => (
                <button key={z.value} class="tab" aria-pressed={s.textScale === z.value} data-on={s.textScale === z.value} onClick={() => mutate((x) => void (x.settings.textScale = z.value))}>
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section class="panel panel-pad">
          <h2 class="label">Your save</h2>
          <p class="muted small">
            {savingWorks.value ? 'Progress is saved in this browser after every action.' : 'This browser is blocking storage, so progress is lost when you close the page.'} There is no account, and nothing is uploaded.
          </p>
          <div class="row wrap">
            <button class="btn btn-small btn-ghost" onClick={() => void copy()}>
              Copy save
            </button>
            <button class="btn btn-small btn-ghost" onClick={() => setShown(!shown)}>
              {shown ? 'Hide box' : 'Paste a save'}
            </button>
          </div>
          {shown && (
            <>
              <textarea aria-label="Save data" value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Paste save data here" />
              <button class="btn btn-small btn-gold" disabled={text.trim().length === 0} onClick={() => void load()}>
                Load this save
              </button>
            </>
          )}
        </section>

        <section class="panel panel-pad">
          <h2 class="label">About</h2>
          <p class="muted small">
            Duskline is a working title. Gloam, the game's only currency, is earned by playing and spent on Kindling. There is no real-money purchase of any kind.
          </p>
        </section>

        <button class="btn btn-primary btn-block" onClick={() => void reset()}>
          Erase everything
        </button>
      </div>
    </div>
  );
}
