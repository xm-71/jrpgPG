import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  CLEAR_GLOAM,
  DAILY_GLOAM,
  FLOOR_GLOAM,
  FLOORS,
  WEEKLY_MILESTONE_DAYS,
  WEEKLY_MILESTONE_GLOAM,
  battleFor,
  choices,
  chooseNode,
  crewFor,
  crewHpFrac,
  dayKey,
  finishBattle,
  isUnlocked,
  nodeLevel,
  pickGlimmer,
  runRewards,
  settleDescent,
  startRun,
  takeRest,
  type DescentNode,
  type DescentRun,
  type DescentSettlement,
} from '@duskline/core';
import { DESCENT_POOLS, GLIMMERS, descentDeps, requireEnemy, requireHero } from '@duskline/content';
import { BattleScreen, type BattleOutcome } from '../battle/BattleScreen';
import { now, randomSeed } from '../game/clock';
import { back, go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile, toast } from '../game/store';
import { HeroImg } from '../ui/Art';
import { AffinityIcon, GloamIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';

const PATH_LABEL = { noonward: 'Noonward', duskward: 'Duskward', nightward: 'Nightward' } as const;
const PATH_HINT = {
  noonward: 'Offence',
  duskward: 'Sustain',
  nightward: 'Control',
} as const;
const KIND_LABEL: Record<DescentNode['kind'], string> = { battle: 'Skirmish', elite: 'Elite', rest: 'Rest', boss: 'Boss' };

const glimmerName = (id: string): string => GLIMMERS.find((g) => g.id === id)?.name ?? id;

function TopBar({ title, right }: { title: string; right?: JSX.Element }): JSX.Element {
  return (
    <header class="topbar">
      <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
        ←
      </button>
      <h1 class="display">{title}</h1>
      {right}
    </header>
  );
}

function Crew({ run }: { run: DescentRun }): JSX.Element {
  return (
    <div class="ds-crew">
      {run.crew.map((c) => {
        const f = run.hp[c.hero] ?? 1;
        return (
          <div key={c.hero} class="ds-member panel">
            <HeroImg hero={requireHero(c.hero)} crop="bust" />
            <span class="ds-name">{requireHero(c.hero).name}</span>
            <span class={`meter meter-hp${f < 0.3 ? ' low' : ''}`}>
              <i style={{ width: `${Math.round(f * 100)}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Entry(): JSX.Element {
  const p = profile.value;
  const day = dayKey(now());
  const dailyDone = p.descent.dailyClears.includes(day);
  const unlocked = isUnlocked(p, 'descent');
  const start = (daily: boolean): void => {
    sfx.tap();
    mutate((x) => {
      x.descent.run = startRun(
        { seed: daily ? `daily-${day}` : randomSeed(), daily: daily ? day : null, crew: crewFor(x, x.party), rank: x.rank, pools: DESCENT_POOLS },
        descentDeps,
      );
    });
  };
  return (
    <div class="screen">
      <Sky variant="night" />
      <TopBar title="Descent" />
      <div class="body scroll ds-entry">
        <p class="muted">
          Three floors of the Umbral Reach. Your HP carries from fight to fight, and after each one you pick a Glimmer, a boon that lasts the run.
        </p>
        {!unlocked && <p class="panel panel-pad">Clear stage 1-2 in the Story to open the Descent.</p>}
        <p class="label">Your crew</p>
        <div class="ds-crew">
          {p.party.map((id) => (
            <div key={id} class="ds-member panel">
              <HeroImg hero={requireHero(id)} crop="bust" />
              <span class="ds-name">{requireHero(id).name}</span>
            </div>
          ))}
        </div>
        <button class="btn btn-ghost btn-small" onClick={() => go({ name: 'roster' })}>
          Edit party
        </button>
        <div class="panel panel-pad ds-pay">
          <p class="label">Rewards</p>
          <p class="row">
            <span class="grow">Each floor</span>
            <span class="gloam">
              <GloamIcon />
              {FLOOR_GLOAM}
            </span>
          </p>
          <p class="row">
            <span class="grow">Full clear</span>
            <span class="gloam">
              <GloamIcon />
              {CLEAR_GLOAM}
            </span>
          </p>
          <p class="row">
            <span class="grow">Daily seed, first clear each day</span>
            <span class="gloam">
              <GloamIcon />
              {DAILY_GLOAM}
            </span>
          </p>
          <p class="row">
            <span class="grow">{WEEKLY_MILESTONE_DAYS} daily clears in a week</span>
            <span class="gloam">
              <GloamIcon />
              {WEEKLY_MILESTONE_GLOAM}
            </span>
          </p>
          <p class="muted ds-note">Descent pays are capped each week, so there is never a reason to grind.</p>
        </div>
        <p class="muted ds-note">
          Best so far: {p.descent.bestFloors} of {FLOORS} floors · {p.descent.clears} clears
        </p>
      </div>
      <div class="foot btn-stack">
        <button class="btn btn-primary btn-block" disabled={!unlocked} onClick={() => start(true)}>
          Daily run
          <span class="sub">{dailyDone ? 'Bonus taken today. Same seed, no daily bonus.' : 'Same map for everyone today'}</span>
        </button>
        <button class="btn btn-ghost btn-block" disabled={!unlocked} onClick={() => start(false)}>
          Free run
        </button>
      </div>
    </div>
  );
}

function GlimmerOffer({ run }: { run: DescentRun }): JSX.Element {
  const opening = run.node === null;
  return (
    <div class="screen">
      <Sky variant="night" />
      <TopBar title="Glimmer" />
      <div class="body scroll">
        <p class="muted">{opening ? 'The Reach lends you one boon before you step in. Choose it to cover your crew’s weak spot.' : 'A Glimmer stays with you until the run ends. Choose one.'}</p>
        <div class="ds-offers">
          {run.offer?.map((id) => {
            const g = GLIMMERS.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                class={`ds-glimmer panel path-${g.path}`}
                onClick={() => {
                  sfx.pull(g.rarity === 3 ? 5 : g.rarity === 2 ? 4 : 3);
                  mutate((x) => pickGlimmer(x.descent.run!, descentDeps, id));
                }}
              >
                <span class="row">
                  <strong class="grow">{g.name}</strong>
                  <span class={`chip ds-path path-${g.path}`}>{PATH_LABEL[g.path]}</span>
                </span>
                <span class="ds-gtext">{g.text}</span>
                <span class="label">
                  {'★'.repeat(g.rarity)} · {PATH_HINT[g.path]}
                </span>
              </button>
            );
          })}
        </div>
        {run.glimmers.length > 0 && (
          <>
            <p class="label ds-h">Held</p>
            <div class="row wrap gap-s">
              {run.glimmers.map((id) => (
                <span key={id} class="chip">
                  {glimmerName(id)}
                </span>
              ))}
            </div>
          </>
        )}
        <Crew run={run} />
      </div>
    </div>
  );
}

function NodeCard({ run, n, onPick }: { run: DescentRun; n: DescentNode; onPick: () => void }): JSX.Element {
  const foes = n.encounter ? [...new Set(descentDeps.encounter(n.encounter).foes.map((f) => f.enemy))].map(requireEnemy) : [];
  const weak = [...new Set(foes.flatMap((f) => f.weaknesses))];
  return (
    <button class={`ds-node panel kind-${n.kind}`} onClick={onPick}>
      <span class="row">
        <strong class="display ds-kind">{KIND_LABEL[n.kind]}</strong>
        {n.kind !== 'rest' && <span class="label">Lv {nodeLevel(run, n)}</span>}
      </span>
      {n.kind === 'rest' ? (
        <span class="muted">Heal the crew a little and breathe.</span>
      ) : (
        <>
          <span class="ds-foes">{foes.map((f) => f.name).join(' · ')}</span>
          <span class="row gap-s">
            <span class="label">Weak</span>
            {weak.map((a) => (
              <AffinityIcon key={a} a={a} size={16} />
            ))}
          </span>
        </>
      )}
    </button>
  );
}

function Choose({ run }: { run: DescentRun }): JSX.Element {
  const opts = choices(run);
  return (
    <div class="screen">
      <Sky variant="night" />
      <TopBar
        title={`Floor ${run.floor + 1} of ${FLOORS}`}
        right={
          <span class="chip" title="Average crew HP">
            {Math.round(crewHpFrac(run) * 100)}% HP
          </span>
        }
      />
      <div class="body scroll">
        <div class="ds-progress" aria-label={`Floor ${run.floor + 1}, step ${run.step + 1} of 3`}>
          {[0, 1, 2].map((s) => (
            <i key={s} class={s < run.step ? 'done' : s === run.step ? 'now' : ''} />
          ))}
        </div>
        <p class="label">Choose your path</p>
        <div class="ds-nodes">
          {opts.map((n) => (
            <NodeCard
              key={n.id}
              run={run}
              n={n}
              onPick={() => {
                sfx.tap();
                mutate((x) => chooseNode(x.descent.run!, n.id));
              }}
            />
          ))}
        </div>
        {run.glimmers.length > 0 && (
          <>
            <p class="label ds-h">Glimmers</p>
            <div class="row wrap gap-s">
              {run.glimmers.map((id) => (
                <span key={id} class="chip">
                  {glimmerName(id)}
                </span>
              ))}
            </div>
          </>
        )}
        <Crew run={run} />
      </div>
    </div>
  );
}

function Rest({ run }: { run: DescentRun }): JSX.Element {
  return (
    <div class="screen">
      <Sky variant="dusk" />
      <TopBar title="Rest" />
      <div class="body center-col">
        <h2 class="display">A quiet corner</h2>
        <p class="muted">The lantern steadies. The crew recovers 40% of their HP.</p>
        <Crew run={run} />
        <button
          class="btn btn-primary btn-block"
          onClick={() => {
            sfx.heal();
            mutate((x) => takeRest(x.descent.run!));
          }}
        >
          Rest
        </button>
      </div>
    </div>
  );
}

function Fight({ run }: { run: DescentRun }): JSX.Element {
  const b = battleFor(run, descentDeps);
  const finish = (o: BattleOutcome): void => {
    const hp: Record<string, number> = {};
    for (const u of o.battle.state.units) if (u.side === 'party') hp[u.id] = Math.max(0, u.hp / u.maxHp);
    mutate((x) => {
      finishBattle(x.descent.run!, descentDeps, { victory: o.result === 'victory', hp, actions: o.battle.state.stats.turns });
      // Fights in the Descent feed the daily tasks like any other.
    });
  };
  return (
    <BattleScreen
      key={b.seed}
      setup={b.setup}
      seed={b.seed}
      title={`${KIND_LABEL[b.node.kind]} · Floor ${b.node.floor + 1}`}
      sky="night"
      onDone={finish}
      onQuit={() => mutate((x) => finishBattle(x.descent.run!, descentDeps, { victory: false, hp: {}, actions: 0 }))}
      quitNote="Retreating ends the run. You keep the floors you have already cleared."
    />
  );
}

function Results({ run }: { run: DescentRun }): JSX.Element {
  const [paid, setPaid] = useState<DescentSettlement | null>(null);
  const cleared = run.result === 'cleared';
  const preview = runRewards(run);
  const collect = (): void => {
    const s = mutate((x) => settleDescent(x, x.descent.run!, now()));
    sfx.win();
    setPaid(s);
    for (const t of s.tasks) toast(`Task done: ${t.task.text}. +${t.gloam} Gloam`, 'good');
  };
  return (
    <div class="screen">
      <Sky variant={cleared ? 'noon' : 'night'} />
      <div class="body center-col">
        <p class="label">{run.daily ? 'Daily run' : 'Free run'}</p>
        <h2 class="display">{cleared ? 'Descent cleared' : 'The run ends here'}</h2>
        <p class="muted">
          {run.stats.floorsCleared} of {FLOORS} floors · {run.stats.battles} fights won
        </p>
        <div class="panel panel-pad reward-card">
          {paid ? (
            <>
              <p class="row reward-line">
                <span>Floors</span>
                <span class="gloam">
                  <GloamIcon />+{paid.floorGloam}
                </span>
              </p>
              {paid.clearGloam > 0 && (
                <p class="row reward-line">
                  <span>Clear bonus</span>
                  <span class="gloam">
                    <GloamIcon />+{paid.clearGloam}
                  </span>
                </p>
              )}
              {paid.dailyGloam > 0 && (
                <p class="row reward-line">
                  <span>Daily bonus</span>
                  <span class="gloam">
                    <GloamIcon />+{paid.dailyGloam}
                  </span>
                </p>
              )}
              {paid.weeklyGloam > 0 && (
                <p class="row reward-line">
                  <span>Weekly milestone</span>
                  <span class="gloam">
                    <GloamIcon />+{paid.weeklyGloam}
                  </span>
                </p>
              )}
              <p class="row reward-line">
                <span>Lamplighter XP</span>
                <span class="num">+{paid.xp}</span>
              </p>
              {paid.ranksGained > 0 && (
                <p class="row reward-line">
                  <span>Rank up! Now rank {profile.value.rank}</span>
                  <span class="gloam">
                    <GloamIcon />+{paid.rankGloam}
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <p class="row reward-line">
                <span>Floor pay</span>
                <span class="gloam">
                  <GloamIcon />
                  {preview.floorGloam}
                </span>
              </p>
              <p class="row reward-line">
                <span>Lamplighter XP</span>
                <span class="num">+{preview.xp}</span>
              </p>
            </>
          )}
        </div>
        <div class="btn-stack">
          {paid ? (
            <>
              <button class="btn btn-primary btn-block" onClick={() => go({ name: 'descent' }, { replace: true })}>
                Another run
              </button>
              <button class="btn btn-ghost btn-block" onClick={() => go({ name: 'home' }, { replace: true })}>
                Home
              </button>
            </>
          ) : (
            <button class="btn btn-primary btn-block" onClick={collect}>
              Collect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Descent(): JSX.Element {
  const run = profile.value.descent.run;
  if (!run) return <Entry />;
  switch (run.phase) {
    case 'glimmer':
      return <GlimmerOffer run={run} />;
    case 'choose':
      return <Choose run={run} />;
    case 'rest':
      return <Rest run={run} />;
    case 'battle':
      return <Fight run={run} />;
    case 'done':
      return <Results run={run} />;
  }
}
