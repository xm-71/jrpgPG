import { describe, expect, test } from 'vitest';
import { checkInvariants, encounterFoes, heroUnit, playout, recommendParty, type BattleSetup } from '@duskline/core';
import { STAGES, ownedHeroIdsBefore, rankBefore, requireEncounter, requireEnemy, requireHero } from './index';

/** A player who arrives at each stage at the intended Rank, with a sensible party. */
function onCurve(index: number, rankDelta = 0): BattleSetup {
  const stage = STAGES[index]!;
  const encounter = requireEncounter(stage.encounter);
  const owned = ownedHeroIdsBefore(index).map(requireHero);
  const party = stage.forcedParty ?? recommendParty(owned, encounter.foes.map((f) => requireEnemy(f.enemy)));
  const rank = Math.max(1, rankBefore(index) + rankDelta);
  return {
    party: party.map((id) => heroUnit(requireHero(id), rank)),
    foes: encounterFoes(encounter, stage.level, requireEnemy),
  };
}

const SEEDS = 120;

describe('campaign difficulty, played by the auto-play policy', () => {
  test('the intended Rank arrives at each stage at that stage’s level', () => {
    STAGES.forEach((stage, i) => expect(rankBefore(i), stage.id).toBe(stage.level));
  });

  for (const [index, stage] of STAGES.entries()) {
    test(`${stage.id} ${stage.name}: winnable, never breaks a rule, sensible length`, () => {
      const setup = onCurve(index);
      let wins = 0;
      let actions = 0;
      const problems: string[] = [];
      for (let seed = 0; seed < SEEDS; seed++) {
        const r = playout(setup, `balance:${stage.id}:${seed}`, {
          onStep: (b) => problems.push(...checkInvariants(b.state)),
        });
        expect(r.timedOut, `seed ${seed} did not finish`).toBe(false);
        if (r.result === 'victory') wins++;
        actions += r.actions;
      }
      expect(problems).toEqual([]);
      const rate = wins / SEEDS;
      const avgActions = actions / SEEDS;
      // The tutorial is close to a sure thing, the boss is allowed to bite.
      expect(rate).toBeGreaterThanOrEqual(stage.id === '0-1' ? 0.99 : stage.id === '1-5' ? 0.85 : 0.95);
      // About five seconds an action: between half a minute and six minutes.
      expect(avgActions).toBeGreaterThan(6);
      expect(avgActions).toBeLessThan(72);
    });
  }

  test('falling well behind the curve hurts on the elite and the boss', () => {
    for (const id of ['1-4', '1-5']) {
      const index = STAGES.findIndex((s) => s.id === id);
      const wins = (delta: number): number => {
        const setup = onCurve(index, delta);
        let w = 0;
        for (let seed = 0; seed < SEEDS; seed++) if (playout(setup, `behind:${id}:${seed}`).result === 'victory') w++;
        return w / SEEDS;
      };
      expect(wins(-4), id).toBeLessThan(wins(0));
      expect(wins(-4), id).toBeLessThan(0.6);
    }
  });
});
