import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { PARTY_SIZE, applyResonance, cardPassives, cardStrength, equipCard, setParty, statsAtLevel, type HeroDef } from '@duskline/core';
import { AFTERLIGHTS, CARDS, HEROES, cardById, requireCard, requireHero } from '@duskline/content';
import { back } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile, toast } from '../game/store';
import { CardImg, HeroImg } from '../ui/Art';
import { AffinityIcon, AffinityTag, ROLE_LABEL, Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { TARGET_LABEL, describePassive, skillCost } from '../ui/text';
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

function HeroCard({ hero, owned, inParty, onOpen }: { hero: HeroDef; owned: boolean; inParty: boolean; onOpen: () => void }): JSX.Element {
  const res = profile.value.collection.heroes[hero.id]?.resonance ?? 0;
  return (
    <button class={`hcard panel r${hero.rarity}${owned ? '' : ' locked'}${inParty ? ' in-party' : ''}`} onClick={onOpen} aria-label={owned ? hero.name : `${hero.name}, not yet kindled`}>
      <div class="hcard-art">
        <HeroImg hero={hero} crop="bust" />
        {inParty && <span class="chip chip-gold hcard-flag">Party</span>}
      </div>
      <div class="hcard-info">
        <span class="hcard-name">{owned ? hero.name : '???'}</span>
        <span class="row gap-s">
          <AffinityIcon a={hero.affinity} size={14} />
          <Stars n={hero.rarity} />
        </span>
        {owned ? <ResonancePips rank={res} /> : <span class="muted hcard-hint">From Kindling</span>}
      </div>
    </button>
  );
}

function HeroSheet({ hero, onClose }: { hero: HeroDef; onClose: () => void }): JSX.Element {
  const p = profile.value;
  const owned = !!p.collection.heroes[hero.id];
  const res = p.collection.heroes[hero.id]?.resonance ?? 1;
  const stats = applyResonance(statsAtLevel(hero.base, p.rank), res);
  const inParty = p.party.includes(hero.id);
  const cardId = p.equipped[hero.id];
  const [picking, setPicking] = useState(false);
  const ownedCards = CARDS.filter((c) => (p.collection.cards[c.id] ?? 0) > 0);

  const toggleParty = (): void => {
    sfx.tap();
    if (inParty) {
      if (p.party.length <= 1) {
        toast('A party needs at least one hero.', 'warn');
        return;
      }
      mutate((x) => setParty(x, x.party.filter((id) => id !== hero.id)));
    } else if (p.party.length >= PARTY_SIZE) {
      toast('Your party is full. Remove someone first.', 'warn');
    } else {
      mutate((x) => setParty(x, [...x.party, hero.id]));
    }
  };

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet scroll" role="dialog" aria-modal="true" aria-label={hero.name}>
        <div class="hsheet-head">
          <div class="hsheet-art">
            <HeroImg hero={hero} crop="half" />
          </div>
          <div class="grow">
            <div class="row gap-s wrap">
              <Stars n={hero.rarity} />
              <span class="label">{hero.origin === 'afterlight' ? 'Afterlight' : 'Story'}</span>
            </div>
            <h2 class="display">{owned ? hero.name : '???'}</h2>
            <p class="muted">{hero.title}</p>
            <div class="row gap-s wrap">
              <AffinityTag a={hero.affinity} />
              <span class="chip">{ROLE_LABEL[hero.role]}</span>
            </div>
            {hero.turning && <p class="label hsheet-turning">{hero.turning}</p>}
          </div>
        </div>

        {owned ? (
          <>
            <div class="stat-grid">
              {(['hp', 'atk', 'def', 'spd'] as const).map((k) => (
                <div key={k} class="stat">
                  <span class="label">{k.toUpperCase()}</span>
                  <span class="num stat-value">{stats[k]}</span>
                </div>
              ))}
            </div>
            <div class="row">
              <span class="label grow">Resonance</span>
              <ResonancePips rank={res} />
            </div>
            <p class="muted small">Kindling the same hero again raises Resonance, which adds 4% to HP, ATK and DEF each rank. At rank 5 a duplicate pays Gloam.</p>

            <h3 class="label">Skills</h3>
            {[hero.kit.basic, hero.kit.skill, hero.kit.ultimate].map((s) => (
              <div key={s.id} class="skill panel-pad panel">
                <div class="row">
                  {s.affinity ? <AffinityIcon a={s.affinity} size={16} /> : <span class="aff" style={{ width: '16px' }} />}
                  <strong class="grow">{s.name}</strong>
                  <span class="chip">{s.kind === 'ultimate' ? 'Ultimate' : s.kind === 'skill' ? 'Skill' : 'Attack'}</span>
                </div>
                <p class="muted">{s.blurb}</p>
                <p class="label">
                  {TARGET_LABEL[s.target]} · {skillCost(s)}
                  {s.shell > 0 ? ` · Shell ${s.shell}` : ''}
                </p>
              </div>
            ))}

            <h3 class="label">Memory Card</h3>
            {cardId ? (
              <div class="row equipped panel panel-pad">
                <CardImg card={requireCard(cardId)} class="mini-card" />
                <div class="grow">
                  <strong>{requireCard(cardId).name}</strong>
                  {cardById(cardId)?.passives.map((pa, i) => (
                    <p key={i} class="muted small">
                      {describePassive(pa, cardStrength(p.collection.cards[cardId] ?? 1))}
                    </p>
                  ))}
                </div>
                <button class="btn btn-small btn-ghost" onClick={() => mutate((x) => equipCard(x, hero.id, null))}>
                  Remove
                </button>
              </div>
            ) : (
              <p class="muted small">No card equipped.</p>
            )}
            {picking ? (
              <div class="card-picker">
                {ownedCards.length === 0 && <p class="muted small">You have no cards yet. Kindling can give them.</p>}
                {ownedCards.map((c) => (
                  <button
                    key={c.id}
                    class="pick"
                    onClick={() => {
                      sfx.tap();
                      mutate((x) => equipCard(x, hero.id, c.id));
                      setPicking(false);
                    }}
                  >
                    <CardImg card={c} class="mini-card" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              ownedCards.length > 0 && (
                <button class="btn btn-ghost btn-small" onClick={() => setPicking(true)}>
                  {cardId ? 'Change card' : 'Equip a card'}
                </button>
              )
            )}
            <blockquote class="quote">“{hero.quote}”</blockquote>
            <p class="muted">{hero.blurb}</p>
          </>
        ) : (
          <p class="muted">
            Not yet kindled. {hero.origin === 'afterlight' ? 'Afterlights answer the Gloamstone in Kindling.' : 'This hero joins through the story.'}
          </p>
        )}

        <div class="row">
          <button class="btn btn-ghost grow" onClick={onClose}>
            Close
          </button>
          {owned && (
            <button class={`btn ${inParty ? 'btn-ghost' : 'btn-gold'} grow`} onClick={toggleParty}>
              {inParty ? 'Remove from party' : 'Add to party'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardTile({ id }: { id: string }): JSX.Element {
  const p = profile.value;
  const card = requireCard(id);
  const copies = p.collection.cards[id] ?? 0;
  const owner = Object.entries(p.equipped).find(([, c]) => c === id)?.[0];
  return (
    <div class={`ctile panel${copies === 0 ? ' locked' : ''}`}>
      <CardImg card={card} />
      <div class="ctile-info">
        <strong>{copies > 0 ? card.name : '???'}</strong>
        {copies > 0 ? (
          <>
            {cardPassives(card, copies).map((pa, i) => (
              <span key={i} class="muted small">
                {describePassive(pa)}
              </span>
            ))}
            <span class="label num">
              {copies} of 5 copies{owner ? ` · on ${requireHero(owner).name}` : ''}
            </span>
          </>
        ) : (
          <span class="muted small">From Kindling</span>
        )}
      </div>
    </div>
  );
}

export function Roster({ hero: openHero }: { hero?: string | undefined }): JSX.Element {
  const p = profile.value;
  const [tab, setTab] = useState<'heroes' | 'cards'>('heroes');
  const [open, setOpen] = useState<string | null>(openHero ?? null);
  const owned = new Set(Object.keys(p.collection.heroes));
  const ordered = [...HEROES].sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)));
  const total = { heroes: HEROES.length, afterlights: AFTERLIGHTS.length };
  const gotAfterlights = AFTERLIGHTS.filter((h) => owned.has(h.id)).length;

  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Roster</h1>
        <GloamPill amount={p.gloam} />
      </header>
      <div class="body scroll">
        <section aria-label="Current party">
          <div class="row">
            <span class="label grow">Party</span>
            <span class="label num">
              {p.party.length} / {PARTY_SIZE}
            </span>
          </div>
          <div class="party-slots">
            {Array.from({ length: PARTY_SIZE }, (_, i) => {
              const id = p.party[i];
              const h = id ? requireHero(id) : null;
              return (
                <button key={i} class={`slot panel${h ? '' : ' empty'}`} onClick={() => h && setOpen(h.id)} aria-label={h ? h.name : 'Empty slot'}>
                  {h ? (
                    <>
                      <HeroImg hero={h} crop="bust" />
                      <span class="slot-name">{h.name.split(' ')[0]}</span>
                    </>
                  ) : (
                    <span class="muted">Empty</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div class="tabs" role="tablist">
          <button class="tab" role="tab" aria-selected={tab === 'heroes'} onClick={() => setTab('heroes')}>
            Heroes {owned.size}/{total.heroes}
          </button>
          <button class="tab" role="tab" aria-selected={tab === 'cards'} onClick={() => setTab('cards')}>
            Cards {Object.keys(p.collection.cards).length}/{CARDS.length}
          </button>
        </div>

        {tab === 'heroes' ? (
          <>
            <div class="hero-grid">
              {ordered.map((h) => (
                <HeroCard key={h.id} hero={h} owned={owned.has(h.id)} inParty={p.party.includes(h.id)} onOpen={() => setOpen(h.id)} />
              ))}
            </div>
            <p class="muted small">
              {gotAfterlights} of {total.afterlights} Afterlights answered. Story heroes join as you play.
            </p>
          </>
        ) : (
          <div class="card-list">
            {[...CARDS].sort((a, b) => b.rarity - a.rarity).map((c) => (
              <CardTile key={c.id} id={c.id} />
            ))}
          </div>
        )}
      </div>
      {open && <HeroSheet hero={requireHero(open)} onClose={() => setOpen(null)} />}
    </div>
  );
}
