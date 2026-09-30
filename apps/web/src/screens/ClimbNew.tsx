import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  CLEAR_GLOAM,
  DAILY_GLOAM,
  FLOOR_GLOAM,
  WEEKLY_MILESTONE_DAYS,
  WEEKLY_MILESTONE_GLOAM,
  dayKey,
  maxHpFor,
  passiveText,
  setHero,
  unlockedStrata,
  type Affinity,
} from '@duskline/core';
import { HEROES, STRATA, requireCard, requireEncounter, requireFoe, requireHero } from '@duskline/content';
import { now } from '../game/clock';
import { beginClimb } from '../game/flow';
import { back } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile } from '../game/store';
import { HeroImg } from '../ui/Art';
import { CardFace } from '../ui/CardFace';
import { AffinityIcon, GloamIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';

const NUMERAL = ['I', 'II', 'III'];

function weaknessesOf(stratum: number): Affinity[] {
  const s = STRATA[stratum]!;
  const ids = [...s.floors.flatMap((f) => [...f.battles, f.guardian]), ...s.elites];
  const count = new Map<Affinity, number>();
  for (const id of ids) for (const sp of requireEncounter(id).foes) for (const a of requireFoe(sp.foe).weaknesses) count.set(a, (count.get(a) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
}

export function ClimbNew({ daily = false }: { daily?: boolean }): JSX.Element {
  const p = profile.value;
  const open = unlockedStrata(p, STRATA.length);
  const [stratum, setStratum] = useState(Math.min(open - 1, 0));
  const owned = HEROES.filter((h) => p.collection.heroes[h.id]);
  const hero = requireHero(p.hero);
  const res = p.collection.heroes[hero.id]?.resonance ?? 1;
  const sig = requireCard(hero.starter.find((id) => requireCard(id).source === 'hero') ?? hero.starter[0]!);
  const today = dayKey(now());
  const dailyDone = p.climb.dailyClears.includes(today);

  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1>{daily ? 'Daily climb' : 'Climb'}</h1>
      </header>
      <div class="body scroll climb-new">
        <p class="label">Who climbs</p>
        <div class="hero-strip" role="listbox" aria-label="Choose a Lamplighter">
          {owned.map((h) => (
            <button
              key={h.id}
              role="option"
              aria-selected={h.id === hero.id}
              class={`hero-pick${h.id === hero.id ? ' on' : ''}`}
              onClick={() => {
                sfx.tap();
                mutate((x) => setHero(x, h.id));
              }}
            >
              <HeroImg hero={h} crop="face" />
              <span class="hero-pick-name">{h.name.split(' ')[0]}</span>
              <AffinityIcon a={h.affinity} size={12} />
            </button>
          ))}
        </div>
        <div class="panel panel-pad hero-brief">
          <div class="row">
            <span class="display hero-brief-name">{hero.name}</span>
            <span class="grow" />
            <span class="chip">{maxHpFor(hero.hp, res, p.rank)} HP</span>
          </div>
          <p class="hero-brief-trait">
            <b>{hero.trait.name}.</b> {hero.trait.passives.map(passiveText).join(' ')}
          </p>
          <div class="hero-brief-cards">
            <CardFace def={sig} up={res >= 3} size="list" />
            <p class="muted small">
              Starts with 3 Lamp Cuts, 3 Braces and 2 × {sig.name}. Ultimate: <b>{requireCard(hero.ultimate).name}</b>.
            </p>
          </div>
        </div>

        <p class="label">Where</p>
        <div class="strata">
          {STRATA.map((s, i) => {
            const locked = i >= open;
            const rec = p.climb.strata[String(i)];
            return (
              <button key={s.id} class={`stratum panel${i === stratum ? ' on' : ''}${locked ? ' locked' : ''}`} disabled={locked} onClick={() => setStratum(i)}>
                <span class="stratum-num">{NUMERAL[i]}</span>
                <span class="stratum-info">
                  <span class="stratum-name">{locked ? 'Sealed' : s.name}</span>
                  <span class="muted small">{locked ? `Clear ${STRATA[i - 1]!.name} to open it.` : s.blurb}</span>
                  {!locked && (
                    <span class="row gap-s stratum-weak">
                      <span class="label">Fades here are weak to</span>
                      {weaknessesOf(i)
                        .slice(0, 4)
                        .map((a) => (
                          <AffinityIcon key={a} a={a} size={14} />
                        ))}
                    </span>
                  )}
                </span>
                <span class="stratum-rec label">{rec ? (rec.clears > 0 ? `Cleared ×${rec.clears}` : `Best: floor ${rec.reached + 1}`) : 'New'}</span>
              </button>
            );
          })}
        </div>

        <div class="panel panel-pad pay">
          <p class="label">What it pays in Gloam</p>
          <p class="row">
            <span class="grow">Each floor cleared</span>
            <span class="gloam">
              <GloamIcon />
              {FLOOR_GLOAM}
            </span>
          </p>
          <p class="row">
            <span class="grow">Reaching the top</span>
            <span class="gloam">
              <GloamIcon />
              {CLEAR_GLOAM}
            </span>
          </p>
          {daily && (
            <>
              <p class="row">
                <span class="grow">Daily seed, first clear today</span>
                <span class="gloam">
                  <GloamIcon />
                  {dailyDone ? 0 : DAILY_GLOAM}
                </span>
              </p>
              <p class="row">
                <span class="grow">{WEEKLY_MILESTONE_DAYS} daily clears in a week</span>
                <span class="gloam">
                  <GloamIcon />
                  {WEEKLY_MILESTONE_GLOAM}
                </span>
              </p>
            </>
          )}
          <p class="muted small">Climbing pays are capped each week, so there is never a reason to grind.</p>
        </div>
      </div>
      <div class="foot">
        <button
          class="btn btn-primary btn-block"
          onClick={() => {
            sfx.tap();
            beginClimb({ stratum, daily });
          }}
        >
          Enter {STRATA[stratum]!.name}
          <span class="sub">{daily ? (dailyDone ? 'Today’s seed again, without the daily bonus' : 'Today’s seed, the same for everyone') : 'A fresh seed'}</span>
        </button>
      </div>
    </div>
  );
}
