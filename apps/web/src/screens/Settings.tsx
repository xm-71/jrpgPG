import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { newProfile } from '@duskline/core';
import { STARTER_HEROES } from '@duskline/content';
import { now } from '../game/clock';
import { back, go } from '../game/nav';
import { applyUpdate, cacheVersion, canAddToHome, canInstall, installed, needsShareSheet, offlineState, online, persisted, promptInstall, updateReady } from '../game/offline';
import { copyMode, downloadOfflineCopy, isDownloadedCopy, type CopyMode } from '../game/offlineCopy';
import { exportProfile, importProfile } from '../game/persist';
import { sfx } from '../game/sfx';
import { isFreshSave, mutate, profile, replaceProfile, resetProfile, savingWorks, toast } from '../game/store';
import { coachOn, skipTutorial, startTutorial } from '../tutorial/coach';
import { AddToHomeSteps } from '../ui/AddToHome';
import { ask } from '../ui/Dialog';
import { Sky } from '../ui/Sky';

const SIZES = [
  { label: 'Normal', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Larger', value: 1.3 },
];

/** What the offline state means, in words. */
function offlineStatus(): { text: string; tone: 'good' | 'wait' | 'warn' | 'plain' } {
  const state = offlineState.value;
  if (isDownloadedCopy()) return { text: 'You are playing the offline copy. It needs no connection.', tone: 'good' };
  if (installed.value && state === 'ready') return { text: 'Installed. Duskline opens from your home screen or app list, with or without a connection.', tone: 'good' };
  if (state === 'ready') return { text: online.value ? 'Ready. This device has everything it needs, so Duskline opens with no connection.' : 'You are offline, and the game is running from this device.', tone: 'good' };
  if (state === 'preparing') return { text: 'Saving Duskline to this device. Stay connected until this says Ready.', tone: 'wait' };
  if (state === 'failed') return { text: 'Duskline could not be saved for offline play. The browser may be out of space or blocking storage. You can still play while connected.', tone: 'warn' };
  if (__SINGLE_FILE__) return { text: 'This page cannot install itself. Download the offline copy to play anywhere without a connection.', tone: 'plain' };
  if (!window.isSecureContext) return { text: 'Browsers only save a game for offline play from a secure (https) address. Download the offline copy instead.', tone: 'plain' };
  return { text: 'This browser cannot save the game for offline play. Download the offline copy instead.', tone: 'plain' };
}

function OfflinePanel(): JSX.Element {
  const [mode, setMode] = useState<CopyMode>('checking');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void copyMode().then((m) => live && setMode(m));
    return () => {
      live = false;
    };
  }, []);
  const status = offlineStatus();
  return (
    <section class="panel panel-pad offline" aria-labelledby="offline-title">
      <h2 class="label" id="offline-title">
        Play offline
      </h2>
      <p class={`offline-status ${status.tone}`} role="status">
        <span class="offline-dot" aria-hidden="true" />
        {status.text}
      </p>
      {updateReady.value && (
        <div class="offline-row">
          <p class="grow">A new version is ready.</p>
          <button
            class="btn btn-small btn-primary"
            onClick={() => {
              sfx.tap();
              applyUpdate();
            }}
          >
            Restart to update
          </button>
        </div>
      )}
      {canInstall.value && (
        <button
          class="btn btn-primary btn-block"
          onClick={() => {
            sfx.tap();
            void promptInstall();
          }}
        >
          Install Duskline
        </button>
      )}
      {canAddToHome() && (
        <div class="offline-steps">
          <p class="label">Add it to your Home Screen</p>
          <AddToHomeSteps />
          <p class="muted small">Safari can clear a site's saved files after a week away. The Home Screen app is exempt, so it is the safer place to play offline on an iPhone or iPad.</p>
        </div>
      )}
      {installed.value && needsShareSheet() && isFreshSave.value && (
        <p class="muted small">Played in Safari before? Its save is separate from this app's. Open Duskline in Safari, tap Copy save, then come back here and use Paste a save below.</p>
      )}
      {(mode === 'checking' || mode === 'viewer' || mode === 'link') && (
        <button
          class="btn btn-block btn-stacked"
          disabled={mode === 'checking' || busy}
          onClick={async () => {
            sfx.tap();
            setBusy(true);
            await downloadOfflineCopy(mode === 'viewer' ? 'viewer' : 'link');
            setBusy(false);
          }}
        >
          Download offline copy
          <span class="sub">One file with the whole game. Open it in any browser, no install.</span>
        </button>
      )}
      {mode === 'blocked' && <p class="muted small">This view cannot save files. Open Duskline in your browser to download the offline copy.</p>}
      <p class="muted small">Progress is kept separately in the installed app, in each browser and in the offline file. To move it between them, use Copy save and Paste a save below.</p>
      {offlineState.value === 'ready' && (
        <p class="muted small offline-meta">
          {cacheVersion.value ? `Files ${cacheVersion.value}` : 'Files saved'}
          {persisted.value ? ' · kept safe from clean-ups' : ''}
        </p>
      )}
    </section>
  );
}

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
      <div class="body scroll settings-list">
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
          <label class="switch">
            <span>
              <strong>Tutorial hints</strong>
              <br />
              <span class="muted small">Short coaching cards the first time each part of the game comes up.</span>
            </span>
            <input type="checkbox" checked={coachOn.value} onChange={(e) => (e.currentTarget.checked ? startTutorial(false) : skipTutorial())} />
          </label>
          <div class="row wrap">
            <button
              class="btn btn-small btn-ghost"
              onClick={() => {
                sfx.tap();
                go({ name: 'guide' });
              }}
            >
              How to play
            </button>
            <button
              class="btn btn-small btn-ghost"
              onClick={() => {
                sfx.tap();
                startTutorial(true);
                toast('The tutorial will play again as you go.', 'good');
              }}
            >
              Replay the tutorial
            </button>
          </div>
        </section>

        <OfflinePanel />

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
              <textarea
                aria-label="Save data"
                value={text}
                onInput={(e) => setText(e.currentTarget.value)}
                // iOS can leave the page nudged up after its keyboard closes.
                onBlur={() => window.scrollTo(0, 0)}
                placeholder="Paste save data here"
              />
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
