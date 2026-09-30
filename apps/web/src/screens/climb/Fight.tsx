import type { JSX } from 'preact';
import { abandonClimb, battleSetup, finishFight, recordFight, type ClimbRun } from '@duskline/core';
import { STRATA, climbDeps, requireEncounter } from '@duskline/content';
import { BattleScreen, type BattleOutcome } from '../../battle/BattleScreen';
import { now } from '../../game/clock';
import { mutate, toast } from '../../game/store';

const KIND: Record<string, string> = { battle: '', elite: 'Elite · ', guardian: 'Guardian · ', boss: 'Boss · ' };

export function Fight({ run }: { run: ClimbRun }): JSX.Element {
  const b = run.battle!;
  const setup = battleSetup(run, climbDeps);
  const enc = requireEncounter(b.encounter);
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
    />
  );
}
