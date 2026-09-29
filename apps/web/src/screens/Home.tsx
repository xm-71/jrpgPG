import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { dayKey, ensureTasks, isUnlocked, tasksForDay, xpToNext, type Feature } from '@duskline/core';
import { STAGES, requireHero } from '@duskline/content';
import { now } from '../game/clock';
import { go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile } from '../game/store';
import { HeroImg } from '../ui/Art';
import { GloamIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';

const LOCK_HINT: Record<Feature, string> = {
  kindling: 'Kindle the Gloamstone first',
  roster: 'Kindle the Gloamstone first',
  tasks: 'Kindle the Gloamstone first',
  descent: 'Clear 1-2 The Hush Road',
};

export function GloamPill({ amount }: { amount: number }): JSX.Element {
  return (
    <span class="gloam num" title="Gloam: earned by playing, spent on Kindling">
      <GloamIcon />
      {amount.toLocaleString('en-US')}
    </span>
  );
}

function MenuCard({
  title,
  hint,
  feature,
  onOpen,
  glow = false,
}: {
  title: string;
  hint: string;
  feature?: Feature;
  onOpen: () => void;
  glow?: boolean;
}): JSX.Element {
  const p = profile.value;
  const locked = feature ? !isUnlocked(p, feature) : false;
  return (
    <button
      class={`menu-card panel${glow && !locked ? ' glow' : ''}`}
      disabled={locked}
      onClick={() => {
        sfx.tap();
        onOpen();
      }}
    >
      <span class="display menu-title">{title}</span>
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

  const next = STAGES.find((s) => (p.progress.cleared[s.id] ?? 0) === 0) ?? null;
  const needsKindle = (p.progress.cleared['0-1'] ?? 0) > 0 && !p.progress.flags['firstKindling'];
  const tasks = tasksForDay(today);
  const dailyDone = p.descent.dailyClears.includes(today);
  const canPull = p.gloam >= 100;

  return (
    <div class="screen home">
      <Sky />
      <header class="topbar">
        <div class="rank">
          <span class="label">Lamplighter rank</span>
          <span class="display rank-num num">{p.rank}</span>
          <div class="meter meter-xp rank-meter" role="progressbar" aria-label="Rank progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((p.xp / xpToNext(p.rank)) * 100)}>
            <i style={{ width: `${Math.min(100, (p.xp / xpToNext(p.rank)) * 100)}%` }} />
          </div>
        </div>
        <span class="grow" />
        <GloamPill amount={p.gloam} />
        <button class="btn btn-ghost btn-icon" aria-label="Settings" onClick={() => go({ name: 'settings' })}>
          ⚙
        </button>
      </header>

      <div class="home-party" aria-label="Your party">
        {p.party.map((id, i) => (
          <div key={id} class="home-hero" style={{ '--i': i } as JSX.CSSProperties}>
            <HeroImg hero={requireHero(id)} crop="full" />
          </div>
        ))}
      </div>

      <div class="body scroll home-body">
        {needsKindle ? (
          <button
            class="cta panel glow"
            onClick={() => {
              sfx.tap();
              go({ name: 'kindling' });
            }}
          >
            <span class="label">The stone is warm</span>
            <span class="display cta-title">Kindle the Gloamstone</span>
            <span class="menu-hint">Something answered. Find out who.</span>
          </button>
        ) : next ? (
          <button
            class="cta panel"
            onClick={() => {
              sfx.tap();
              go({ name: 'story' });
            }}
          >
            <span class="label">
              {p.progress.flags['seenPrologue'] || (p.progress.cleared['0-1'] ?? 0) > 0 ? 'Continue story' : 'Start the story'} · stage {next.id}
            </span>
            <span class="display cta-title">{next.name}</span>
            <span class="menu-hint">
              {next.blurb} First clear pays {next.firstClearGloam} Gloam.
            </span>
          </button>
        ) : (
          <button class="cta panel" onClick={() => go({ name: 'story' })}>
            <span class="label">Chapter 1 complete</span>
            <span class="display cta-title">Replay the story</span>
            <span class="menu-hint">More of the Duskline is on the way.</span>
          </button>
        )}

        <div class="menu-grid">
          <MenuCard title="Descent" feature="descent" hint={dailyDone ? 'Daily cleared. Try a free run.' : 'The daily run pays 120 Gloam.'} glow={!dailyDone} onOpen={() => go({ name: 'descent' })} />
          <MenuCard title="Kindling" feature="kindling" hint={canPull ? 'You can kindle now.' : 'Earn Gloam by playing.'} glow={canPull} onOpen={() => go({ name: 'kindling' })} />
          <MenuCard title="Roster" feature="roster" hint={`${Object.keys(p.collection.heroes).length} heroes, ${Object.keys(p.collection.cards).length} cards`} onOpen={() => go({ name: 'roster' })} />
          <MenuCard title="Story" hint={`${STAGES.filter((s) => (p.progress.cleared[s.id] ?? 0) > 0).length} of ${STAGES.length} stages cleared`} onOpen={() => go({ name: 'story' })} />
        </div>

        {isUnlockedTasks(p) && (
          <section class="panel panel-pad tasks" aria-label="Daily tasks">
            <div class="row">
              <span class="label grow">Daily tasks</span>
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

const isUnlockedTasks = (p: ReturnType<typeof profile.peek>): boolean => isUnlocked(p, 'tasks');
