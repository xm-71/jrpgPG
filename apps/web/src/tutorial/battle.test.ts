import { describe, expect, it } from 'vitest';
import {
  autoStep,
  battleSetup,
  chooseCardAction,
  createBattle,
  finishFight,
  startClimb,
  submitAction,
  type CardEvent,
} from '@duskline/core';
import { climbDeps } from '@duskline/content';
import { lessonsFor } from './battle';
import { LESSONS } from './lessons';

const hit = (weak: boolean): CardEvent => ({ t: 'hit', target: 'f1', amount: 6, blocked: 0, hp: 10, ward: 0, shell: 2, weak, resist: false });

describe('lessonsFor', () => {
  it('is empty when nothing worth a lesson happened', () => {
    expect(lessonsFor([])).toEqual([]);
    expect(lessonsFor([{ t: 'turn', turn: 1, light: 4 }, hit(false), { t: 'gauge', value: 10 }])).toEqual([]);
  });

  it('teaches weakness on a weak hit, Break on a Break, and Chain once a Chain has a step', () => {
    expect(lessonsFor([hit(true)])).toEqual(['fight.weak']);
    expect(lessonsFor([{ t: 'break', unit: 'f1' }])).toEqual(['fight.break']);
    expect(lessonsFor([{ t: 'chain', steps: 0, affinity: 'flame' }])).toEqual([]);
    expect(lessonsFor([{ t: 'chain', steps: 1, affinity: 'flame' }])).toEqual(['fight.chain']);
  });

  it('teaches the ultimate, broken ward, Ash and the late hour', () => {
    expect(lessonsFor([{ t: 'ultimate', uid: 9, id: 'ult' }])).toEqual(['fight.ultimate']);
    expect(lessonsFor([{ t: 'shatter', uid: 3, lost: 4, ward: 0 }])).toEqual(['fight.shatter']);
    expect(lessonsFor([{ t: 'curse', count: 1 }])).toEqual(['fight.ash']);
    expect(lessonsFor([{ t: 'late' }])).toEqual(['fight.late']);
  });

  it('keeps the order things happened in and names each lesson once', () => {
    const events: CardEvent[] = [hit(true), { t: 'break', unit: 'f1' }, hit(true), { t: 'chain', steps: 2, affinity: 'gale' }, { t: 'break', unit: 'f2' }];
    expect(lessonsFor(events)).toEqual(['fight.weak', 'fight.break', 'fight.chain']);
  });

  it('only ever names lessons that exist', () => {
    const all: CardEvent[] = [
      hit(true),
      { t: 'break', unit: 'f1' },
      { t: 'chain', steps: 3, affinity: null },
      { t: 'ultimate', uid: 1, id: 'u' },
      { t: 'shatter', uid: 2, lost: 1, ward: 0 },
      { t: 'curse', count: 2 },
      { t: 'late' },
    ];
    for (const id of lessonsFor(all)) expect(LESSONS[id], id).toBeDefined();
    expect(lessonsFor(all)).toHaveLength(7);
  });

  it('calls for the weakness, Break and Chain lessons in a real climb of the Root', () => {
    const run = startClimb({ seed: 'hush', daily: null, stratum: 0, hero: 'wren', resonance: 1, rank: 1, kindled: {}, archive: [] }, climbDeps);
    const called = new Set<string>();
    for (let i = 0; i < 400 && run.phase !== 'done'; i++) {
      if (run.phase !== 'battle') {
        autoStep(run, climbDeps);
        continue;
      }
      const { state, events } = createBattle(battleSetup(run, climbDeps), run.battle!.seed);
      for (const id of lessonsFor(events)) called.add(id);
      for (let n = 0; n < 400 && !state.over; n++) {
        const action = chooseCardAction(state);
        if (!action) break;
        for (const id of lessonsFor(submitAction(state, action))) called.add(id);
      }
      finishFight(run, climbDeps, { victory: state.result === 'victory', hp: state.hero.hp, stats: state.stats });
    }
    expect(run.phase).toBe('done');
    for (const id of ['fight.weak', 'fight.break', 'fight.chain']) expect(called.has(id), id).toBe(true);
    for (const id of called) expect(LESSONS[id], id).toBeDefined();
  });
});
