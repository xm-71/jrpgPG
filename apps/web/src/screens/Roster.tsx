import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { maxHpFor, passiveText, releaseEcho, setHero, type HeroDef } from '@duskline/core';
import { AFTERLIGHTS, BEATS, BOUND, HEROES, KINDLED, POOL, requireCard, requireHero } from '@duskline/content';
import { go, back } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile } from '../game/store';
import { HeroImg, MOODS } from '../ui/Art';
import { STYLE_NAME } from '../art/manga/names';
import { CardFace } from '../ui/CardFace';
import { ask } from '../ui/Dialog';
import { AffinityIcon, ROLE_LABEL, Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { GloamPill } from './Home';

function ResonancePips({ rank }: { rank: number }): JSX.Element {
  return (
    <span class="pips" role="img" aria-label={`Resonance ${rank} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} class={i < rank ? 'on' : ''} />
      ))}
    </span>
  );
}

const MOOD_LABEL = { calm: 'Calm', fierce: 'Fierce', hurt: 'Hurt', smile: 'Glad', shock: 'Shocked' } as const;

function joinsHow(h: HeroDef): string {
  if (h.origin === 'afterlight') return 'From Kindling';
  const beat = BEATS.find((b) => b.unlocks?.includes(h.id));
  return beat ? `Joins in “${beat.title}”` : 'Joins in the story';
}

function HeroCard({ hero, onOpen }: { hero: HeroDef; onOpen: () => void }): JSX.Element {
  const p = profile.value;
  const owned = !!p.collection.heroes[hero.id];
  const picked = p.hero === hero.id;
  return (
    <button class={`hcard panel r${hero.rarity}${owned ? '' : ' locked'}${picked ? ' picked' : ''}`} onClick={onOpen} aria-label={owned ? hero.name : `${hero.name}, not yet with you`}>
      <span class="hcard-art">
        <HeroImg hero={hero} crop="bust" />
        {picked && <span class="chip chip-gold hcard-flag">Climbing</span>}
      </span>
      <span class="hcard-info">
        <span class="hcard-name">{owned ? hero.name : '???'}</span>
        <span class="row gap-s">
          <AffinityIcon a={hero.affinity} size={13} />
          <Stars n={hero.rarity} />
        </span>
        {owned ? <ResonancePips rank={p.collection.heroes[hero.id]!.resonance} /> : <span class="muted hcard-hint">{joinsHow(hero)}</span>}
      </span>
    </button>
  );
}

function HeroSheet({ hero, onClose }: { hero: HeroDef; onClose: () => void }): JSX.Element {
  const p = profile.value;
  const owned = !!p.collection.heroes[hero.id];
  const res = p.collection.heroes[hero.id]?.resonance ?? 1;
  const sig = requireCard(hero.starter.find((id) => requireCard(id).source === 'hero') ?? hero.starter[0]!);
  return (
    <div class="overlay" onClick={onClose}>
      <div class="sheet hsheet" onClick={(e) => e.stopPropagation()}>
        <div class="hsheet-head">
          <HeroImg hero={hero} crop="full" class="hsheet-art" />
          <div class="grow">
            <p class="label">{hero.title}</p>
            <h2>{hero.name}</h2>
            <p class="row gap-s">
              <Stars n={hero.rarity} />
              <AffinityIcon a={hero.affinity} size={16} />
              <span class="chip">{ROLE_LABEL[hero.role]}</span>
            </p>
            <p class="row gap-s hsheet-stats">
              <span class="chip">{maxHpFor(hero.hp, res, p.rank)} HP</span>
              {owned && <ResonancePips rank={res} />}
            </p>
            {hero.turning && <p class="muted small">{hero.turning}</p>}
          </div>
        </div>
        <p class="quote">“{hero.quote}”</p>
        <div class="expressions" aria-label="Expressions">
          {MOODS.map((m) => (
            <figure key={m} class="expression">
              <HeroImg hero={hero} crop="bust" mood={owned ? m : 'calm'} />
              <figcaption class="label">{MOOD_LABEL[m]}</figcaption>
            </figure>
          ))}
        </div>
        <p class="muted small">
          Drawn in the <b>{STYLE_NAME[hero.look.style]}</b> tradition.
        </p>
        <p class="muted small">{hero.blurb}</p>
        <div class="panel panel-pad trait">
          <p class="label">Trait · {hero.trait.name}</p>
          <p>{hero.trait.passives.map(passiveText).join(' ')}</p>
          <p class="muted small">Resonance adds 5% max HP a step. At Resonance 3 the hero’s own starting cards come tempered; at 5, the ultimate does.</p>
        </div>
        <p class="label">Starting deck</p>
        <p class="muted small">3 Lamp Cuts, 3 Braces, and two of:</p>
        <div class="card-row">
          <CardFace def={sig} up={res >= 3} size="list" />
        </div>
        <p class="label">Signature cards · only this hero finds them</p>
        <div class="card-row">
          {hero.signature.map((id) => (
            <CardFace key={id} def={requireCard(id)} size="list" />
          ))}
        </div>
        <p class="label">Ultimate · conjured when the gauge fills</p>
        <div class="card-row">
          <CardFace def={requireCard(hero.ultimate)} up={res >= 5} size="list" />
        </div>
        <div class="btn-stack hsheet-actions">
          {owned ? (
            <button
              class="btn btn-primary btn-block"
              onClick={() => {
                sfx.tap();
                mutate((x) => setHero(x, hero.id));
                go({ name: 'climb-new' });
              }}
            >
              Climb with {hero.name.split(' ')[0]}
            </button>
          ) : (
            <p class="muted small">{joinsHow(hero)}.</p>
          )}
          <button class="btn btn-ghost btn-block" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function Roster({ hero }: { hero?: string }): JSX.Element {
  const p = profile.value;
  const [tab, setTab] = useState<'heroes' | 'cards' | 'echoes'>('heroes');
  const [open, setOpen] = useState<string | null>(hero ?? null);
  const kindled = KINDLED.filter((c) => (p.collection.cards[c.id] ?? 0) > 0);
  const story = HEROES.filter((h) => h.origin === 'story');
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1>Lamplighters</h1>
        <GloamPill amount={p.gloam} />
      </header>
      <div class="tabs roster-tabs" role="tablist">
        <button class="tab" role="tab" aria-selected={tab === 'heroes'} onClick={() => setTab('heroes')}>
          Heroes
        </button>
        <button class="tab" role="tab" aria-selected={tab === 'cards'} onClick={() => setTab('cards')}>
          Cards
        </button>
        <button class="tab" role="tab" aria-selected={tab === 'echoes'} onClick={() => setTab('echoes')}>
          Echoes {p.archive.length}
        </button>
      </div>
      <div class="body scroll roster">
        {tab === 'heroes' && (
          <>
            <p class="label">The crew of Vesper</p>
            <div class="hero-grid">
              {story.map((h) => (
                <HeroCard key={h.id} hero={h} onOpen={() => setOpen(h.id)} />
              ))}
            </div>
            <p class="label">Afterlights · from Kindling</p>
            <div class="hero-grid">
              {AFTERLIGHTS.map((h) => (
                <HeroCard key={h.id} hero={h} onOpen={() => setOpen(h.id)} />
              ))}
            </div>
          </>
        )}
        {tab === 'cards' && (
          <>
            <p class="label">Kindled cards · {kindled.length} of {KINDLED.length}</p>
            <p class="muted small">Cards you kindle join the rewards of every climb. At 3 copies they are offered already tempered.</p>
            <div class="card-grid">
              {kindled.map((c) => (
                <div key={c.id} class="card-cell">
                  <CardFace def={c} up={(p.collection.cards[c.id] ?? 0) >= 3} size="list" />
                  <span class="card-copies label">
                    {p.collection.cards[c.id]} {p.collection.cards[c.id] === 1 ? 'copy' : 'copies'}
                  </span>
                </div>
              ))}
              {kindled.length === 0 && <p class="muted small">None yet.</p>}
            </div>
            <p class="label">Bound Fades · found after fights</p>
            <div class="card-grid">
              {BOUND.map((c) => (
                <CardFace key={c.id} def={c} size="list" />
              ))}
            </div>
            <p class="label">The common pool</p>
            <div class="card-grid">
              {POOL.map((c) => (
                <CardFace key={c.id} def={c} size="list" />
              ))}
            </div>
          </>
        )}
        {tab === 'echoes' && (
          <>
            <p class="muted small">Echoes are cards the Gnomon made from how you fought. You can keep up to 12; kept Echoes can turn up as rewards in any climb.</p>
            <div class="card-grid">
              {p.archive.map((e) => (
                <div key={e.id} class="card-cell">
                  <CardFace def={e} size="list" />
                  <button
                    class="btn btn-small btn-ghost"
                    onClick={async () => {
                      if (await ask({ title: 'Let this Echo go?', body: `${e.name} will not turn up again.`, confirm: 'Let it go', danger: true })) mutate((x) => releaseEcho(x, e.id));
                    }}
                  >
                    Let go
                  </button>
                </div>
              ))}
              {p.archive.length === 0 && <p class="muted small">No Echoes kept yet. Take one at a Mirror, then keep it when the climb ends.</p>}
            </div>
          </>
        )}
      </div>
      {open && <HeroSheet hero={requireHero(open)} onClose={() => setOpen(null)} />}
    </div>
  );
}
