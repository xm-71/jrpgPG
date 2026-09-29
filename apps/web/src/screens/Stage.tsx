import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { PARTY_SIZE, encounterFoes, firstKindling, partyUnits, clearStage, recordBattle, type StageRewards, type TaskCompletion } from '@duskline/core';
import { FIRST_KINDLING_HERO, STAGES, requireCard, requireEncounter, requireEnemy, requireHero, requireStage } from '@duskline/content';
import { BattleScreen, type BattleOutcome } from '../battle/BattleScreen';
import { now, randomSeed } from '../game/clock';
import { back, go } from '../game/nav';
import { sfx } from '../game/sfx';
import { mutate, profile, toast } from '../game/store';
import { HeroImg } from '../ui/Art';
import { Dialogue } from '../ui/Dialogue';
import { AffinityIcon, GloamIcon, Stars } from '../ui/Icons';
import { Sky } from '../ui/Sky';

type Phase = 'before' | 'brief' | 'battle' | 'after' | 'kindle' | 'reward' | 'lost';

const TIPS: Record<string, string> = {
  '0-1': 'Hit an enemy’s weakness to chip its Shell. Empty Shell means Break: bonus damage and a lost turn.',
  '0-2': 'A weakness hit gives an Encore, a free extra action. Pass the baton to give an ally a damage bonus.',
  '1-1': 'When every foe is Broken, Horizon Burst hits them all at once.',
};

function Briefing({ stageId, onFight }: { stageId: string; onFight: () => void }): JSX.Element {
  const stage = requireStage(stageId);
  const enc = requireEncounter(stage.encounter);
  const p = profile.value;
  const ids = stage.forcedParty ?? p.party;
  const foes = [...new Set(enc.foes.map((f) => f.enemy))].map(requireEnemy);
  return (
    <div class="screen">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1 class="display">Stage {stage.id}</h1>
      </header>
      <div class="body scroll">
        <h2 class="display brief-title">{stage.name}</h2>
        <p class="muted">{stage.blurb}</p>
        <p class="label brief-h">Enemies · Lv {stage.level}</p>
        <div class="panel panel-pad brief-foes">
          {foes.map((f) => (
            <div key={f.id} class="brief-foe">
              <strong>{f.name}</strong>
              <span class="row gap-s">
                <span class="label">Weak to</span>
                {f.weaknesses.map((a) => (
                  <AffinityIcon key={a} a={a} size={18} />
                ))}
              </span>
            </div>
          ))}
        </div>
        <p class="label brief-h">
          Your party {stage.forcedParty ? '· set for this fight' : `· up to ${PARTY_SIZE}`}
        </p>
        <div class="brief-party">
          {ids.map((id) => {
            const h = requireHero(id);
            return (
              <div key={id} class="brief-hero panel">
                <HeroImg hero={h} crop="bust" />
                <span>{h.name}</span>
                <AffinityIcon a={h.affinity} size={14} />
              </div>
            );
          })}
        </div>
        {!stage.forcedParty && (
          <button class="btn btn-ghost btn-small" onClick={() => go({ name: 'roster' })}>
            Edit party
          </button>
        )}
        {(p.progress.cleared[stage.id] ?? 0) === 0 && (
          <p class="row gap-s brief-reward">
            <span class="label">First clear</span>
            <span class="gloam">
              <GloamIcon />
              {stage.firstClearGloam}
            </span>
          </p>
        )}
      </div>
      <div class="foot">
        <button class="btn btn-primary btn-block" onClick={onFight}>
          Fight
        </button>
      </div>
    </div>
  );
}

export function Stage({ id }: { id: string }): JSX.Element {
  const stage = requireStage(id);
  const [phase, setPhase] = useState<Phase>('before');
  const [seed, setSeed] = useState(randomSeed);
  const [rewards, setRewards] = useState<{ r: StageRewards; tasks: TaskCompletion[] } | null>(null);
  const settled = useRef(false);

  const setup = () => {
    const p = profile.value;
    const ids = stage.forcedParty ?? p.party;
    return {
      party: partyUnits(p, ids, { hero: requireHero, card: requireCard }),
      foes: encounterFoes(requireEncounter(stage.encounter), stage.level, requireEnemy),
    };
  };

  const finish = (o: BattleOutcome): void => {
    if (o.result === 'defeat') {
      mutate((p) => void recordBattle(p, o.battle.state.stats, false, now()));
      setPhase('lost');
      return;
    }
    if (!settled.current) {
      settled.current = true;
      const out = mutate((p) => {
        const r = clearStage(p, stage, now());
        const tasks = recordBattle(p, o.battle.state.stats, true, now());
        return { r, tasks };
      });
      setRewards(out);
      for (const t of out.tasks) toast(`Task done: ${t.task.text}. +${t.gloam} Gloam`, 'good');
    }
    setPhase('after');
  };

  const afterStory = (): void => {
    const needsKindle = stage.id === STAGES[0]!.id && !profile.value.progress.flags['firstKindling'];
    setPhase(needsKindle ? 'kindle' : 'reward');
  };

  if (phase === 'before') return <Dialogue lines={stage.before} onDone={() => setPhase('brief')} />;
  if (phase === 'brief') return <Briefing stageId={id} onFight={() => setPhase('battle')} />;
  if (phase === 'battle')
    return (
      <BattleScreen
        key={seed}
        setup={setup()}
        seed={seed}
        title={`Stage ${stage.id}`}
        tip={(profile.value.progress.cleared[stage.id] ?? 0) === 0 ? TIPS[stage.id] : undefined}
        onDone={finish}
        onQuit={() => setPhase('brief')}
      />
    );
  if (phase === 'after') return <Dialogue lines={stage.after} onDone={afterStory} />;
  if (phase === 'kindle') return <FirstKindle onDone={() => setPhase('reward')} />;
  if (phase === 'lost')
    return (
      <div class="screen">
        <Sky variant="night" />
        <div class="body center-col">
          <h2 class="display">Defeated</h2>
          <p class="muted">The Fades held the rail this time. Check the weaknesses in the briefing, or swap someone in.</p>
          <div class="btn-stack">
            <button
              class="btn btn-primary btn-block"
              onClick={() => {
                setSeed(randomSeed());
                setPhase('battle');
              }}
            >
              Try again
            </button>
            <button class="btn btn-ghost btn-block" onClick={() => setPhase('brief')}>
              Back to briefing
            </button>
            <button class="btn btn-ghost btn-block" onClick={() => go({ name: 'story' }, { replace: true })}>
              Story
            </button>
          </div>
        </div>
      </div>
    );

  const r = rewards?.r;
  const nextStage = STAGES[STAGES.findIndex((s) => s.id === id) + 1];
  return (
    <div class="screen">
      <Sky variant="noon" />
      <div class="body center-col">
        <p class="label">Stage cleared</p>
        <h2 class="display">{stage.name}</h2>
        <div class="panel panel-pad reward-card">
          {r && r.gloam > 0 && (
            <p class="row reward-line">
              <span>First clear</span>
              <span class="gloam">
                <GloamIcon />+{r.gloam}
              </span>
            </p>
          )}
          <p class="row reward-line">
            <span>Lamplighter XP</span>
            <span class="num">+{r?.xp ?? 0}</span>
          </p>
          {r && r.ranksGained > 0 && (
            <p class="row reward-line">
              <span>Rank up! Now rank {profile.value.rank}</span>
              <span class="gloam">
                <GloamIcon />+{r.rankGloam}
              </span>
            </p>
          )}
          {r?.unlocked.map((hid) => (
            <p key={hid} class="row reward-line">
              <span>{requireHero(hid).name} joins your crew</span>
              <Stars n={requireHero(hid).rarity} />
            </p>
          ))}
        </div>
        <div class="btn-stack">
          {nextStage && (
            <button
              class="btn btn-primary btn-block"
              onClick={() => {
                sfx.tap();
                go({ name: 'stage', id: nextStage.id }, { replace: true });
              }}
            >
              Next: {nextStage.name}
            </button>
          )}
          <button class="btn btn-ghost btn-block" onClick={() => go({ name: 'home' }, { replace: true })}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

/** The scripted first Kindling: the Gloamstone answers and Io steps out. No Gloam spent, no pity touched. */
function FirstKindle({ onDone }: { onDone: () => void }): JSX.Element {
  const [lit, setLit] = useState(false);
  const hero = requireHero(FIRST_KINDLING_HERO);
  return (
    <div class="screen">
      <Sky variant="night" />
      <div class="body center-col kindle-first">
        {!lit ? (
          <>
            <p class="label">The Gloamstone</p>
            <h2 class="display">It wants to be lit</h2>
            <div class="stone" aria-hidden="true" />
            <p class="muted">Kindling calls a hero from the Afterlight. You will earn Gloam by playing, and it never costs a coin.</p>
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
            <h2 class="display">{hero.name}</h2>
            <div class="reveal pop">
              <HeroImg hero={hero} crop="half" />
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
