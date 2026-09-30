import { useEffect } from 'preact/hooks';
import type { CardEvent } from '@duskline/core';
import type { CardController } from '../battle/controller';
import { clear, coachOn, complete, teach } from './coach';
import { FIGHT_BASICS } from './lessons';

/** The lessons a set of battle events calls for, in the order to give them. */
export function lessonsFor(events: readonly CardEvent[]): string[] {
  const out: string[] = [];
  const add = (id: string): void => {
    if (!out.includes(id)) out.push(id);
  };
  for (const e of events) {
    switch (e.t) {
      case 'hit':
        if (e.weak) add('fight.weak');
        break;
      case 'break':
        add('fight.break');
        break;
      case 'chain':
        if (e.steps >= 1) add('fight.chain');
        break;
      case 'ultimate':
        add('fight.ultimate');
        break;
      case 'shatter':
        add('fight.shatter');
        break;
      case 'curse':
        add('fight.ash');
        break;
      case 'late':
        add('fight.late');
        break;
    }
  }
  return out;
}

/**
 * Coaches a fight. The basics play at the start of the first fight, one lesson at a time. After that each
 * rule gets its lesson the first time it happens, once the action has finished playing out.
 */
export function useBattleCoach(ctl: CardController, turn: number, idle: boolean): void {
  useEffect(() => {
    ctl.onEvents = (events) => {
      if (!coachOn.peek() || ctl.auto.value || ctl.ended.value) return;
      if (events.some((e) => e.t === 'play')) {
        complete('fight.try');
        teach(['fight.end'], 'fight');
      }
      if (events.some((e) => e.t === 'turn')) complete('fight.end');
      const st = ctl.view.value;
      const anyStatus = [st.hero.statuses, ...st.foes.map((f) => f.statuses)].some((s) => Object.values(s).some((n) => n > 0));
      const ids = lessonsFor(events);
      if (anyStatus) ids.push('fight.status');
      teach(ids, 'fight');
    };
    return () => {
      ctl.onEvents = null;
      clear('fight');
    };
  }, [ctl]);

  const first = turn === 1;
  useEffect(() => {
    if (idle && first) teach(FIGHT_BASICS, 'fight');
  }, [idle, first]);
}
