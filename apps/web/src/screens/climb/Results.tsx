import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { archiveEcho, climbRewards, settleClimb, type ClimbRun, type ClimbSettlement } from '@duskline/core';
import { STRATA, requireHero } from '@duskline/content';
import { now } from '../../game/clock';
import { afterward, finished } from '../../game/flow';
import { sfx } from '../../game/sfx';
import { mutate, profile, toast } from '../../game/store';
import { HeroImg } from '../../ui/Art';
import { CardFace } from '../../ui/CardFace';
import { GloamIcon } from '../../ui/Icons';
import { Sky } from '../../ui/Sky';

function Line({ label, value }: { label: string; value: number }): JSX.Element | null {
  if (value <= 0) return null;
  return (
    <p class="row reward-line">
      <span class="grow">{label}</span>
      <span class="gloam">
        <GloamIcon />+{value}
      </span>
    </p>
  );
}

/** The end of a climb: pay out, keep an Echo if there is one, then the story or home. */
export function Results({ run }: { run: ClimbRun }): JSX.Element {
  const [kept] = useState(() => structuredClone(run));
  const [paid, setPaid] = useState<ClimbSettlement | null>(null);
  const [archived, setArchived] = useState<string | null>(null);
  const cleared = kept.result === 'cleared';
  const preview = climbRewards(kept);
  const echoes = kept.echoes.filter((e) => !kept.archived.includes(e.id));
  const hero = requireHero(kept.hero);

  const collect = (): void => {
    finished.value = kept;
    const s = mutate((p) => settleClimb(p, p.climb.run!, now()));
    sfx.win();
    setPaid(s);
    for (const t of s.tasks) toast(`Task done: ${t.task.text}. +${t.gloam} Gloam`, 'good');
  };

  return (
    <div class="screen">
      <Sky variant={cleared ? 'noon' : 'night'} />
      <div class="body scroll results">
        <div class="results-head">
          <HeroImg hero={hero} crop="full" class="results-hero" />
          <div>
            <p class="label">{kept.daily ? 'Daily climb' : STRATA[kept.stratum]!.name}</p>
            <h2 class="display">{cleared ? 'The stratum is cleared' : 'The light goes out'}</h2>
            <p class="muted">
              {kept.stats.floorsCleared} of 3 floors · {kept.stats.battles} fights won · {kept.deck.length} cards
            </p>
          </div>
        </div>
        <div class="panel panel-pad reward-card">
          {paid ? (
            <>
              <Line label="Floors" value={paid.floorGloam} />
              <Line label="Reaching the top" value={paid.clearGloam} />
              <Line label="Daily seed" value={paid.dailyGloam} />
              <Line label="Weekly milestone" value={paid.weeklyGloam} />
              <p class="row reward-line">
                <span class="grow">Lamplighter XP</span>
                <span class="num">+{paid.xp}</span>
              </p>
              {paid.ranksGained > 0 && <Line label={`Rank ${profile.value.rank}`} value={paid.rankGloam} />}
              {paid.floorGloam + paid.clearGloam < preview.floorGloam + preview.clearGloam && <p class="muted small">This week’s climbing pay is capped, so some of it could not be paid.</p>}
            </>
          ) : (
            <>
              <p class="row reward-line">
                <span class="grow">Floors and clear</span>
                <span class="gloam">
                  <GloamIcon />
                  {preview.floorGloam + preview.clearGloam}
                </span>
              </p>
              <p class="row reward-line">
                <span class="grow">Lamplighter XP</span>
                <span class="num">+{preview.xp}</span>
              </p>
            </>
          )}
        </div>

        {paid && echoes.length > 0 && (
          <section class="keep">
            <p class="label">Keep an Echo</p>
            <p class="muted small">One Echo from this climb can stay with you. Kept Echoes can turn up as rewards in later climbs, for any hero. You can keep {12} at most.</p>
            <div class="offer-cards">
              {echoes.map((e) => (
                <CardFace
                  key={e.id}
                  def={e}
                  size="list"
                  selected={archived === e.id}
                  onClick={() => {
                    if (archived) return;
                    sfx.pull(4);
                    mutate((p) => archiveEcho(p, e));
                    setArchived(e.id);
                    toast(`${e.name} is kept`, 'good');
                  }}
                  label={`Keep ${e.name}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <div class="foot">
        {paid ? (
          <button
            class="btn btn-primary btn-block"
            onClick={() => {
              finished.value = null;
              afterward(profile.value);
            }}
          >
            Continue
          </button>
        ) : (
          <button class="btn btn-gold btn-block" onClick={collect}>
            Collect
          </button>
        )}
      </div>
    </div>
  );
}
