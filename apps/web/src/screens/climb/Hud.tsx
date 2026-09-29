import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { findCard, type ClimbRun } from '@duskline/core';
import { STRATA, climbDeps, requireGlimmer, requireHero } from '@duskline/content';
import { HeroImg } from '../../ui/Art';
import { CardFace } from '../../ui/CardFace';
import { EmberIcon } from '../../ui/Icons';

const PATH_LABEL = { noonward: 'Noonward', duskward: 'Duskward', nightward: 'Nightward' } as const;

/** The whole deck, grouped, as an overlay. */
export function DeckSheet({ run, onClose }: { run: ClimbRun; onClose: () => void }): JSX.Element {
  const groups = new Map<string, { id: string; up: boolean; n: number }>();
  for (const c of run.deck) {
    const key = `${c.id}:${c.up ? 1 : 0}`;
    const g = groups.get(key) ?? { id: c.id, up: c.up === true, n: 0 };
    g.n++;
    groups.set(key, g);
  }
  return (
    <div class="overlay" onClick={onClose}>
      <div class="sheet deck-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <h2 class="grow">Deck · {run.deck.length}</h2>
          <button class="btn btn-small btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div class="deck-grid">
          {[...groups.values()].map((g) => {
            const def = findCard(run, climbDeps, g.id);
            if (!def) return null;
            return (
              <div key={`${g.id}${g.up}`} class="deck-cell">
                <CardFace def={def} up={g.up} size="list" />
                {g.n > 1 && <span class="deck-count">×{g.n}</span>}
              </div>
            );
          })}
        </div>
        {run.glimmers.length > 0 && (
          <>
            <p class="label deck-h">Glimmers</p>
            <div class="glimmer-list">
              {run.glimmers.map((id) => {
                const g = requireGlimmer(id);
                return (
                  <div key={id} class={`glimmer-row path-${g.path}`}>
                    <strong>{g.name}</strong>
                    <span class="muted small">
                      {PATH_LABEL[g.path]} · {g.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Hero, HP, Embers and the deck: always visible between fights. */
export function ClimbHud({ run }: { run: ClimbRun }): JSX.Element {
  const [deck, setDeck] = useState(false);
  const hero = requireHero(run.hero);
  const low = run.hp / run.maxHp < 0.3;
  return (
    <>
      <div class="climb-hud">
        <HeroImg hero={hero} crop="bust" class="climb-hud-face" />
        <div class="grow climb-hud-vitals">
          <div class="row">
            <span class="climb-hud-name">{hero.name}</span>
            <span class="label">
              {STRATA[run.stratum]!.name} · Floor {run.floor + 1}
            </span>
          </div>
          <div class="row">
            <span class={`meter meter-hp grow${low ? ' low' : ''}`}>
              <i style={{ width: `${(run.hp / run.maxHp) * 100}%` }} />
            </span>
            <span class="num climb-hud-hp">
              {run.hp}/{run.maxHp}
            </span>
          </div>
        </div>
        <span class="embers num" title="Embers: spent in this climb only">
          <EmberIcon />
          {run.embers}
        </span>
        <button class="btn btn-small btn-ghost" onClick={() => setDeck(true)} aria-label={`Deck, ${run.deck.length} cards`}>
          Deck {run.deck.length}
        </button>
      </div>
      {deck && <DeckSheet run={run} onClose={() => setDeck(false)} />}
    </>
  );
}
