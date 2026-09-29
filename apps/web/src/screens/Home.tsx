import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { dayKey, ensureTasks, isUnlocked, tasksForDay, unlockedStrata, xpToNext, type Feature } from '@duskline/core';
import { BEATS, STRATA, requireHero } from '@duskline/content';
import { now } from '../game/clock';
import { hasScenes } from '../game/flow';
import { go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile } from '../game/store';
import { HeroImg } from '../ui/Art';
import { AffinityIcon, GloamIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';

const LOCK_HINT: Record<Feature, string> = {
  kindling: 'Finish your first climb',
  roster: 'Finish your first climb',
  tasks: 'Finish your first climb',
  daily: 'Finish your first climb',
};

export function GloamPill({ amount }: { amount: number }): JSX.Element {
  return (
    <span class="gloam num" title="Gloam: earned by playing, spent on Kindling. Never sold.">
      <GloamIcon />
      {amount.toLocaleString('en-US')}
    </span>
  );
}

function MenuCard({ title, hint, feature, onOpen, glow = false }: { title: string; hint: string; feature?: Feature; onOpen: () => void; glow?: boolean }): JSX.Element {
  const locked = feature ? !isUnlocked(profile.value, feature) : false;
  return (
    <button
      class={`menu-card panel${glow && !locked ? ' glow' : ''}`}
      disabled={locked}
      onClick={() => {
        sfx.tap();
        onOpen();
      }}
    >
      <span class="menu-title">{title}</span>
      <span class="menu-hint">{locked && feature ? LOCK_HINT[feature] : hint}</span>
    </button>
  );
}

export function Home(): JSX.Element {
  const p = profile.value;
  const today = dayKey(now());

  useEffect(() => {
    if (profile.value.tasks.day !== today) mutate((x) => ensureTasks(x, now()));
  }, [today]);

  const hero = requireHero(p.hero);
  const run = p.climb.run;
  const tasks = tasksForDay(today);
  const dailyDone = p.climb.dailyClears.includes(today);
  const open = unlockedStrata(p, STRATA.length);
  const seen = p.progress.beats.length;

  return (
    <div class="screen home">
      <Sky variant="dusk" />
      <header class="topbar home-top">
        <div class="rank">
          <span class="rank-num display">{p.rank}</span>
          <span class="rank-meta">
            <span class="label">Lamplighter Rank</span>
            <span class="meter meter-xp rank-meter">
              <i style={{ width: `${(p.xp / xpToNext(p.rank)) * 100}%` }} />
            </span>
          </span>
        </div>
        <span class="grow" />
        <GloamPill amount={p.gloam} />
        <button class="btn btn-ghost btn-icon" aria-label="Settings" onClick={() => go({ name: 'settings' })}>
          ⚙
        </button>
      </header>

      <div class="home-hero" aria-label={`${hero.name} is ready to climb`}>
        <HeroImg hero={hero} crop="full" />
        <div class="home-hero-tag">
          <span class="label">{hero.title}</span>
          <span class="display">{hero.name}</span>
          <span class="row gap-s">
            <AffinityIcon a={hero.affinity} size={14} />
            <span class="muted home-trait">{hero.trait.name}</span>
          </span>
        </div>
      </div>

      <div class="body scroll home-body">
        {hasScenes(p) && (
          <button class="cta panel glow" onClick={() => go({ name: 'scene' })}>
            <span class="label">A new scene</span>
            <span class="cta-title">The story continues</span>
          </button>
        )}
        <button
          class="cta cta-climb"
          onClick={() => {
            sfx.tap();
            go(run ? { name: 'climb' } : { name: 'climb-new' });
          }}
        >
          <span class="label">{run ? `Floor ${run.floor + 1} of ${STRATA[run.stratum]!.name}` : `${open} of ${STRATA.length} strata open`}</span>
          <span class="cta-title">{run ? 'Resume the climb' : 'Climb the Gnomon'}</span>
        </button>
        <div class="menu-grid">
          <MenuCard title="Daily climb" feature="daily" hint={dailyDone ? 'Cleared today. The seed returns tomorrow.' : 'Same map for everyone today. Clear it for 120 Gloam.'} glow={!dailyDone} onOpen={() => go({ name: 'climb-new', daily: true })} />
          <MenuCard title="Kindling" feature="kindling" hint={p.gloam >= 100 ? 'You can kindle now.' : 'Earn Gloam by climbing.'} glow={p.gloam >= 1000} onOpen={() => go({ name: 'kindling' })} />
          <MenuCard title="Lamplighters" feature="roster" hint={`${Object.keys(p.collection.heroes).length} heroes · ${p.archive.length} Echoes kept`} onOpen={() => go({ name: 'roster' })} />
          <MenuCard title="Chronicle" hint={`${seen} of ${BEATS.length} scenes`} onOpen={() => go({ name: 'chronicle' })} />
        </div>

        {isUnlocked(p, 'tasks') && (
          <section class="panel panel-pad tasks" aria-label="Daily tasks">
            <div class="row">
              <span class="label grow">Today</span>
              <span class="label num">{p.tasks.done.length} / 3 · 25 Gloam each</span>
            </div>
            {tasks.map((t) => {
              const done = p.tasks.done.includes(t.id);
              const prog = done ? t.goal : (p.tasks.progress[t.id] ?? 0);
              return (
                <div key={t.id} class={`task${done ? ' done' : ''}`}>
                  <span class="task-text">
                    {done ? '✓ ' : ''}
                    {t.text}
                  </span>
                  <span class="num muted">
                    {prog} / {t.goal}
                  </span>
                  <div class="meter meter-gauge task-meter">
                    <i style={{ width: `${(prog / t.goal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
