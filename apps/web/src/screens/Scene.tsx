import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { dueBeats, firstKindling, seeBeat, type BeatDef } from '@duskline/core';
import { BEATS, FIRST_KINDLING_HERO, requireHero } from '@duskline/content';
import { now } from '../game/clock';
import { FIRST_CLIMB_SEED, beginClimb } from '../game/flow';
import { go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile, toast } from '../game/store';
import { HeroImg } from '../ui/Art';
import { Dialogue } from '../ui/Dialogue';
import { AffinityIcon, Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { sigilSvg } from '../art/sigil';
import { svgUrl } from '../art/figure';
import { BLOOD } from '../art/palette';

/** The scripted first Kindling: the Gloamstone answers and Io steps out. No Gloam spent, no pity touched. */
function FirstKindle({ onDone }: { onDone: () => void }): JSX.Element {
  const [lit, setLit] = useState(false);
  const hero = requireHero(FIRST_KINDLING_HERO);
  return (
    <div class="screen">
      <Sky variant="night" />
      <div class="center-col kindle-first">
        {!lit ? (
          <>
            <p class="label">The Gloamstone</p>
            <h2>It wants to be lit</h2>
            <img class="stone" src={svgUrl(sigilSvg('gloamstone', BLOOD, 200, { hour: 12, numerals: true }))} alt="" />
            <p class="muted">Kindling calls a Lamplighter out of the light. It costs Gloam, and Gloam only comes from playing. Nothing here is ever for sale.</p>
            <button
              class="btn btn-gold btn-block"
              onClick={() => {
                sfx.pull(5);
                mutate((p) => void firstKindling(p, FIRST_KINDLING_HERO, now()));
                setLit(true);
              }}
            >
              Kindle
            </button>
          </>
        ) : (
          <>
            <p class="label">Kindled</p>
            <h2>{hero.name}</h2>
            <div class="reveal pop">
              <HeroImg hero={hero} crop="full" mood="smile" />
            </div>
            <p class="row gap-s">
              <Stars n={hero.rarity} />
              <AffinityIcon a={hero.affinity} size={18} />
            </p>
            <p class="muted">{hero.title}</p>
            <button class="btn btn-primary btn-block" onClick={onDone}>
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Plays every story scene that is due, one after another, then moves on. */
export function Scene(): JSX.Element {
  const [queue] = useState<BeatDef[]>(() => dueBeats(profile.value, BEATS));
  const [i, setI] = useState(0);
  const [kindling, setKindling] = useState(false);
  const beat = queue[i];

  const finish = (): void => {
    const p = profile.value;
    // A brand-new Lamplighter goes straight up the tower after the prologue.
    if (p.climb.runs === 0 && !p.climb.run) beginClimb({ stratum: 0, daily: false, hero: 'wren', seed: FIRST_CLIMB_SEED });
    else if (p.climb.run) go({ name: 'climb' }, { replace: true });
    else go({ name: 'home' }, { replace: true });
  };

  const next = (): void => {
    if (i + 1 >= queue.length) finish();
    else setI(i + 1);
  };

  if (kindling) {
    return (
      <FirstKindle
        onDone={() => {
          setKindling(false);
          next();
        }}
      />
    );
  }
  if (!beat) {
    finish();
    return <div class="screen" />;
  }
  return (
    <Dialogue
      key={beat.id}
      title={beat.title}
      lines={beat.lines}
      sky={beat.sky ?? 'dusk'}
      onDone={() => {
        const r = mutate((p) => seeBeat(p, beat, now()));
        if (r.gloam > 0) toast(`${beat.title}: +${r.gloam} Gloam`, 'good');
        for (const id of r.unlocked) toast(`${requireHero(id).name} joins the Lamplighters`, 'good', 4500);
        if (beat.id === 'answering-lamp' && !profile.value.progress.flags['firstKindling']) setKindling(true);
        else next();
      }}
    />
  );
}
