import { cardStats, type CardDef } from '../cards/defs';
import { createBattle } from '../cards/engine';
import { autoPlay } from '../cards/policy';
import { ASH_ID } from '../cards/rules';
import { canAfford, canTemper, battleSetup, buy, chooseEvent, findCard, finishFight, leaveEvent, leaveShop, mapChoices, moveTo, pickCard, pickGlimmer, rest, takeEcho, takeReward } from './run';
import type { ClimbDeps, ClimbRun, MapNode } from './types';

/**
 * A plain climber for tests and the balance simulator. It makes reasonable, unremarkable choices,
 * so the numbers it produces describe an ordinary player rather than an expert.
 */

/** A rough worth for a card, per Light. */
export function cardValue(def: CardDef, up = false): number {
  if (def.kind === 'curse') return -10;
  const st = cardStats(def, up);
  let v = st.atk * st.hits * (def.target === 'allFoes' ? 1.6 : 1) + st.ward * 0.6;
  for (const e of st.effects) {
    switch (e.type) {
      case 'status':
        v += e.stacks * (e.status === 'burn' ? 1.5 : e.status === 'hex' || e.status === 'chill' ? 2.5 : 1);
        break;
      case 'draw':
        v += 4 * e.count;
        break;
      case 'light':
        v += 5 * e.amount;
        break;
      case 'heal':
      case 'ward':
        v += e.amount;
        break;
      case 'crack':
        v += 4 * e.amount;
        break;
      case 'gauge':
        v += e.amount / 10;
        break;
      case 'cleanse':
        v += 2;
        break;
    }
  }
  return v / Math.max(1, st.cost + 0.5) + (def.tier === 'rare' ? 3 : 0);
}

export interface AutoOptions {
  /** Stop after this many steps, as a guard against bugs. */
  maxSteps?: number;
  /** Called after each fight, for the simulator's statistics. */
  onFight?: (info: { kind: string; encounter: string; victory: boolean; hpBefore: number; hpAfter: number; turns: number; floor: number }) => void;
}

function scoreNode(run: ClimbRun, n: MapNode): number {
  const hp = run.hp / run.maxHp;
  switch (n.kind) {
    case 'battle':
      return 1;
    case 'elite':
      return hp > 0.7 ? 1.5 : -1;
    case 'rest':
      return hp < 0.6 ? 3 : 0.2;
    case 'shop':
      return run.embers >= 60 ? 1.2 : 0.1;
    case 'mirror':
      return 1.1;
    case 'event':
      return 0.8;
    default:
      return 0;
  }
}

export function autoStep(run: ClimbRun, deps: ClimbDeps, o: AutoOptions = {}): void {
  switch (run.phase) {
    case 'glimmer':
      pickGlimmer(run, deps, run.glimmerOffer![0]!);
      break;
    case 'map': {
      const choices = mapChoices(run);
      const best = choices.reduce((a, b) => (scoreNode(run, b) > scoreNode(run, a) ? b : a));
      moveTo(run, deps, best.id);
      break;
    }
    case 'battle': {
      const b = run.battle!;
      const hpBefore = run.hp;
      const { state } = createBattle(battleSetup(run, deps), b.seed);
      autoPlay(state);
      const victory = state.result === 'victory';
      o.onFight?.({ kind: b.kind, encounter: b.encounter, victory, hpBefore, hpAfter: state.hero.hp, turns: state.turn, floor: run.floor });
      finishFight(run, deps, { victory, hp: state.hero.hp, stats: state.stats });
      break;
    }
    case 'reward': {
      const offers = run.reward!.cards;
      let best = -1;
      let bestV = 4.5;
      offers.forEach((c, i) => {
        const def = findCard(run, deps, c.id);
        const v = def ? cardValue(def, c.up) : 0;
        if (v > bestV) {
          best = i;
          bestV = v;
        }
      });
      takeReward(run, best >= 0 && run.deck.length < 26 ? best : null);
      break;
    }
    case 'event': {
      const ev = run.event!;
      if (ev.choice === null) {
        const def = deps.event(ev.id);
        const i = def.choices.findIndex((c) => canAfford(run, c.cost) && (c.cost?.hp ?? 0) < run.hp * 0.3);
        chooseEvent(run, deps, i >= 0 ? i : def.choices.length - 1);
      } else leaveEvent(run, deps);
      break;
    }
    case 'shop': {
      const shop = run.shop!;
      const ash = run.deck.some((c) => c.id === ASH_ID);
      const removeAt = shop.findIndex((s) => s.kind === 'remove' && !s.sold);
      if (ash && removeAt >= 0 && run.embers >= shop[removeAt]!.price) {
        buy(run, deps, removeAt);
        break;
      }
      const i = shop.findIndex((s) => !s.sold && s.kind !== 'remove' && s.price <= run.embers && (s.kind !== 'heal' || run.hp < run.maxHp * 0.6));
      if (i >= 0) buy(run, deps, i);
      else leaveShop(run);
      break;
    }
    case 'rest': {
      const canUp = run.deck.some((c) => canTemper(findCard(run, deps, c.id), c.up));
      rest(run, deps, run.hp < run.maxHp * 0.7 || !canUp ? 'heal' : 'temper');
      break;
    }
    case 'mirror':
      takeEcho(run, 0);
      break;
    case 'pick': {
      const mode = run.pick!.mode;
      const order = [...run.deck];
      let chosen: number | null = null;
      if (mode === 'remove') {
        const pref = [ASH_ID, 'brace', 'cut'];
        for (const id of pref) {
          const c = order.find((x) => x.id === id || x.id.endsWith(`.${id}`));
          if (c) {
            chosen = c.uid;
            break;
          }
        }
        if (run.deck.length <= 5) chosen = null;
      } else if (mode === 'upgrade') {
        const c = order.find((x) => canTemper(findCard(run, deps, x.id), x.up) && findCard(run, deps, x.id)?.source !== 'basic') ?? order.find((x) => canTemper(findCard(run, deps, x.id), x.up));
        chosen = c?.uid ?? null;
      } else {
        const c = order.reduce((a, b) => (cardValue(findCard(run, deps, b.id)!, b.up) > cardValue(findCard(run, deps, a.id)!, a.up) ? b : a));
        chosen = c.uid;
      }
      pickCard(run, deps, chosen);
      break;
    }
    case 'done':
      break;
  }
}

/** Play a whole climb with plain choices. Returns the finished run. */
export function autoClimb(run: ClimbRun, deps: ClimbDeps, o: AutoOptions = {}): ClimbRun {
  const max = o.maxSteps ?? 400;
  for (let i = 0; i < max && run.phase !== 'done'; i++) autoStep(run, deps, o);
  if (run.phase !== 'done') throw new Error(`Climb did not finish in ${max} steps (stuck in ${run.phase})`);
  return run;
}
