import type { JSX } from 'preact';
import { canTemper, findCard, pickCard, pickGlimmer, recordEvent, takeEcho, takeReward, type ClimbRun } from '@duskline/core';
import { climbDeps, requireGlimmer } from '@duskline/content';
import { now } from '../../game/clock';
import { sfx } from '../../game/sfx';
import { mutate, toast } from '../../game/store';
import { CardFace } from '../../ui/CardFace';
import { EmberIcon } from '../../ui/Icons';
import { Sky } from '../../ui/Sky';
import { ClimbHud } from './Hud';

const PATH_LABEL = { noonward: 'Noonward', duskward: 'Duskward', nightward: 'Nightward' } as const;
const PATH_HINT = { noonward: 'Offence', duskward: 'Tempo', nightward: 'Endurance' } as const;

export function RewardView({ run }: { run: ClimbRun }): JSX.Element {
  const r = run.reward!;
  return (
    <div class="screen">
      <Sky variant="tower" />
      <ClimbHud run={run} />
      <div class="body scroll offer">
        <p class="label">Spoils</p>
        <h2 class="offer-title">Choose a card</h2>
        <p class="row gap-s">
          <span class="embers">
            <EmberIcon />+{r.embers}
          </span>
          <span class="muted small">Embers, for markets on the stair.</span>
        </p>
        <div class="offer-cards">
          {r.cards.map((c, i) => {
            const def = findCard(run, climbDeps, c.id);
            if (!def) return null;
            return (
              <div key={c.id} class="offer-card">
                <CardFace
                  def={def}
                  up={c.up}
                  size="list"
                  onClick={() => {
                    sfx.card();
                    mutate((p) => takeReward(p.climb.run!, i));
                  }}
                  label={`Take ${def.name}`}
                />
                {def.source === 'bound' && <span class="chip chip-blood offer-tag">Bound Fade</span>}
                {def.source === 'kindling' && <span class="chip chip-gold offer-tag">Kindled</span>}
                {def.source === 'hero' && <span class="chip offer-tag">Signature</span>}
                {def.source === 'echo' && <span class="chip chip-gold offer-tag">Echo</span>}
              </div>
            );
          })}
        </div>
        <p class="muted small">{r.glimmers ? 'A Glimmer comes next.' : 'Every card makes your deck bigger. Skipping is a real choice.'}</p>
      </div>
      <div class="foot">
        <button class="btn btn-ghost btn-block" onClick={() => mutate((p) => takeReward(p.climb.run!, null))}>
          Take no card
        </button>
      </div>
    </div>
  );
}

export function GlimmerView({ run }: { run: ClimbRun }): JSX.Element {
  const opening = run.node === null;
  return (
    <div class="screen">
      <Sky variant={opening ? 'night' : 'tower'} />
      <ClimbHud run={run} />
      <div class="body scroll offer">
        <p class="label">Glimmer</p>
        <h2 class="offer-title">{opening ? 'The Gnomon lends you a light' : 'Choose a Glimmer'}</h2>
        <p class="muted">{opening ? 'One boon before the first step. It lasts the whole climb, so pick the one your hero lacks.' : 'A Glimmer lasts until the climb ends. Taking one from a Path makes that Path turn up more.'}</p>
        <div class="glimmers">
          {run.glimmerOffer?.map((id) => {
            const g = requireGlimmer(id);
            return (
              <button
                key={id}
                class={`glimmer panel path-${g.path}`}
                onClick={() => {
                  sfx.pull(g.rarity === 3 ? 5 : g.rarity === 2 ? 4 : 3);
                  mutate((p) => pickGlimmer(p.climb.run!, climbDeps, id));
                }}
              >
                <span class="row">
                  <strong class="grow glimmer-name">{g.name}</strong>
                  <span class={`chip path-chip path-${g.path}`}>{PATH_LABEL[g.path]}</span>
                </span>
                <span class="glimmer-text">{g.text}</span>
                <span class="label">
                  {'✦'.repeat(g.rarity)} · {PATH_HINT[g.path]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MirrorView({ run }: { run: ClimbRun }): JSX.Element {
  const echoes = run.mirror ?? [];
  return (
    <div class="screen">
      <Sky variant="night" />
      <ClimbHud run={run} />
      <div class="body scroll offer mirror">
        <p class="label">Mirror</p>
        <h2 class="offer-title">The glass shows how you fight</h2>
        <p class="muted">An Echo is a card the tower makes from your habits in this climb: what you play, what you hold, how you Break and Chain. No two climbs make the same one.</p>
        <div class="offer-cards echoes">
          {echoes.map((e, i) => (
            <div key={e.id} class="offer-card">
              <CardFace
                def={e}
                size="big"
                onClick={() => {
                  sfx.pull(e.tier === 'rare' ? 5 : 4);
                  const tasks = mutate((p) => {
                    takeEcho(p.climb.run!, i);
                    return recordEvent(p, 'echoes', 1, now());
                  });
                  for (const t of tasks) toast(`Task done: ${t.task.text}. +${t.gloam} Gloam`, 'good');
                }}
                label={`Take ${e.name}`}
              />
              <p class="echo-flavor">{e.flavor}</p>
            </div>
          ))}
        </div>
      </div>
      <div class="foot">
        <button class="btn btn-ghost btn-block" onClick={() => mutate((p) => takeEcho(p.climb.run!, null))}>
          Leave the glass alone
        </button>
      </div>
    </div>
  );
}

const PICK_TEXT = {
  remove: { title: 'Remove a card', help: 'A smaller deck draws its best cards more often.' },
  upgrade: { title: 'Temper a card', help: 'A tempered card is stronger for the rest of the climb.' },
  duplicate: { title: 'Copy a card', help: 'Add a second copy of one card.' },
} as const;

export function PickView({ run }: { run: ClimbRun }): JSX.Element {
  const mode = run.pick!.mode;
  const list = run.deck.filter((c) => mode !== 'upgrade' || canTemper(findCard(run, climbDeps, c.id), c.up));
  const text = PICK_TEXT[mode];
  return (
    <div class="screen">
      <Sky variant="tower" />
      <ClimbHud run={run} />
      <div class="body scroll offer">
        <p class="label">{mode === 'remove' && run.pick!.back === 'shop' ? 'Ghost market' : 'Your deck'}</p>
        <h2 class="offer-title">{text.title}</h2>
        <p class="muted">{text.help}</p>
        <div class="pick-grid">
          {list.map((c) => {
            const def = findCard(run, climbDeps, c.id);
            if (!def) return null;
            return (
              <CardFace
                key={c.uid}
                def={def}
                up={mode === 'upgrade' ? true : c.up === true}
                size="list"
                onClick={() => {
                  sfx.tap();
                  try {
                    mutate((p) => pickCard(p.climb.run!, climbDeps, c.uid));
                  } catch (err) {
                    toast((err as Error).message, 'warn');
                  }
                }}
                label={`${text.title}: ${def.name}`}
              />
            );
          })}
        </div>
      </div>
      <div class="foot">
        <button class="btn btn-ghost btn-block" onClick={() => mutate((p) => pickCard(p.climb.run!, climbDeps, null))}>
          {run.pick!.back === 'shop' ? 'Back to the market' : 'Keep them all'}
        </button>
      </div>
    </div>
  );
}
