import { describe, expect, test } from 'vitest';
import {
  FLOORS,
  battleFor,
  checkInvariants,
  chooseNode,
  choices,
  finishBattle,
  pickGlimmer,
  playout,
  startRun,
  takeRest,
  type CrewMember,
  type DescentRun,
} from '@duskline/core';
import { DESCENT_POOLS, GLIMMERS, descentDeps } from './index';

const crew = (ids: string[]): CrewMember[] => ids.map((hero) => ({ hero, resonance: 1, card: null, copies: 0 }));

function play(run: DescentRun, problems: string[]): void {
  let guard = 0;
  while (run.phase !== 'done' && guard++ < 80) {
    if (run.phase === 'choose') {
      const options = choices(run);
      const hurt = Object.values(run.hp).some((h) => h < 0.6);
      chooseNode(run, (options.find((n) => n.kind === 'rest' && hurt) ?? options[0]!).id);
    } else if (run.phase === 'rest') takeRest(run);
    else if (run.phase === 'glimmer') pickGlimmer(run, descentDeps, run.offer![0]!);
    else {
      const { setup, seed } = battleFor(run, descentDeps);
      const out = playout(setup, seed, { onStep: (b) => problems.push(...checkInvariants(b.state)) });
      expect(out.timedOut).toBe(false);
      finishBattle(run, descentDeps, { victory: out.result === 'victory', hp: out.partyHp, actions: out.actions });
    }
  }
}

describe('the Descent with real content', () => {
  test('has enough Glimmers for a full run and a boss on every floor', () => {
    expect(GLIMMERS.length).toBeGreaterThanOrEqual(10);
    expect(DESCENT_POOLS.boss).toHaveLength(FLOORS);
  });

  test('runs from start to finish for many seeds without breaking a rule', () => {
    const problems: string[] = [];
    let cleared = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const run = startRun(
        { seed: `content-${i}`, daily: null, crew: crew(['wren', 'io', 'marisol', 'pip']), rank: 8, pools: DESCENT_POOLS },
        descentDeps,
      );
      play(run, problems);
      expect(run.phase).toBe('done');
      if (run.result === 'cleared') cleared++;
    }
    expect(problems).toEqual([]);
    // A balanced crew at the intended Rank should usually get through.
    expect(cleared / N).toBeGreaterThan(0.6);
  });

  test('a crew with nothing to sustain it struggles', () => {
    let cleared = 0;
    for (let i = 0; i < 30; i++) {
      const run = startRun(
        { seed: `glass-${i}`, daily: null, crew: crew(['wren', 'io', 'tamsin', 'aurelian']), rank: 8, pools: DESCENT_POOLS },
        descentDeps,
      );
      play(run, []);
      if (run.result === 'cleared') cleared++;
    }
    expect(cleared / 30).toBeLessThan(0.5);
  });

  test('the daily seed gives everyone the same map and opening choice', () => {
    const a = startRun({ seed: 'daily:2026-09-29', daily: '2026-09-29', crew: crew(['wren']), rank: 3, pools: DESCENT_POOLS }, descentDeps);
    const b = startRun({ seed: 'daily:2026-09-29', daily: '2026-09-29', crew: crew(['io', 'pip']), rank: 9, pools: DESCENT_POOLS }, descentDeps);
    expect(a.floors).toEqual(b.floors);
    expect(a.offer).toEqual(b.offer);
  });
});
