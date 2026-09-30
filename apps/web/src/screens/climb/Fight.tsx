import type { JSX } from 'preact';
import { abandonClimb, battleSetup, finishFight, recordFight, type ClimbRun } from '@duskline/core';
import { STRATA, climbDeps, requireEncounter } from '@duskline/content';
import { BattleScreen, type BattleOutcome } from '../../battle/BattleScreen';
import { now } from '../../game/clock';
import { isTutorial } from '../../game/flow';
import { mutate, profile, toast } from '../../game/store';

const KIND: Record<string, string> = { battle: '', elite: 'Elite · ', guardian: 'Guardian · ', boss: 'Boss · ' };

const FIRST_TIPS = [
  'Tap a card, then tap it again (or tap a foe) to play it. Cards cost Light: the gold lamps.',
  'Cards you do not play ward you when you end the turn. Check the forecast above End turn: incoming damage against your ward.',
  'Hit a weakness to chip a foe’s Shell. Empty it for a Break: the foe loses its turn and your Light refills.',
];

const LATER_TIPS = ['Play cards of one affinity in a row for a Chain: each step adds 20% damage.', 'Your gauge fills as you play. When it is full, your ultimate appears in your hand, free.'];

export function Fight({ run }: { run: ClimbRun }): JSX.Element {
  const b = run.battle!;
  const setup = battleSetup(run, climbDeps);
  const enc = requireEncounter(b.encounter);
  const tutorial = isTutorial(profile.value);
  const tips = tutorial ? (run.stats.battles === 0 ? FIRST_TIPS : run.stats.battles === 1 ? LATER_TIPS : undefined) : undefined;
  const finish = (o: BattleOutcome): void => {
    const s = o.battle.state;
    const tasks = mutate((p) => {
      finishFight(p.climb.run!, climbDeps, { victory: o.result === 'victory', hp: s.hero.hp, stats: s.stats });
      return recordFight(p, s.stats, o.result === 'victory', b.kind, now());
    });
    for (const t of tasks) toast(`Task done: ${t.task.text}. +${t.gloam} Gloam`, 'good');
  };
  return (
    <BattleScreen
      key={b.seed}
      setup={setup}
      seed={b.seed}
      title={enc.name}
      subtitle={`${KIND[b.kind] ?? ''}${STRATA[run.stratum]!.name} · Floor ${run.floor + 1}`}
      onDone={finish}
      onQuit={() => mutate((p) => abandonClimb(p.climb.run!))}
      quitNote="The climb ends here. Floors you already cleared still pay."
      {...(tips ? { tips } : {})}
    />
  );
}
