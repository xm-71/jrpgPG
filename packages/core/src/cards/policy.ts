import { cardStats, hasKeyword, type CardAction } from './defs';
import { cloneState, defOf, incoming, legalActions, playable, submitAction } from './engine';
import type { CardBattleState } from './state';

/**
 * A readable auto-player. It powers auto-battle and the balance simulations, and it only uses
 * what a player can see: the hand, the Light, the foes' intents and their weaknesses.
 *
 * It looks one card ahead. For each card it could play (and each target), it plays it on a copy
 * of the fight and scores the result as if the turn ended right there. Ending the turn is scored
 * the same way. That is enough to weigh "strike with it" against "hold it and take less".
 */

function burnTotal(stacks: number): number {
  return (stacks * (stacks + 1)) / 2;
}

/** How good a position is if the turn ended now. Higher is better. */
export function evaluate(s: CardBattleState): number {
  if (s.over) return s.result === 'victory' ? 1_000_000 + s.hero.hp * 10 : -1_000_000;
  const h = s.hero;
  const hpFrac = h.hp / h.maxHp;
  let v = 0;

  for (const f of s.foes) {
    if (!f.alive) {
      v += f.maxHp + 40;
      continue;
    }
    v += f.maxHp - f.hp;
    v += Math.min(f.hp, burnTotal(f.statuses.burn ?? 0)) * 0.9;
    v += (f.statuses.hex ?? 0) * 3 + (f.statuses.chill ?? 0) * 2 + (f.statuses.shock ?? 0) * 0.8;
    v -= (f.statuses.rage ?? 0) * 3 + f.ward * 0.8;
    if (f.broken) v += 8;
    else if (!f.hardened) v += (f.maxShell - f.shell) * 2.5;
  }

  const inc = incoming(s);
  const danger = 1.2 + (1 - hpFrac) * 1.6;
  if (inc.taken >= h.hp) v -= 5000;
  v -= inc.taken * danger;
  v += h.hp * 1.2;
  v += h.gauge * 0.12;

  // Light is only worth something if there is still a card to spend it on.
  let spendable = 0;
  for (const c of s.hand) {
    const st = cardStats(defOf(s, c), c.up);
    if (!hasKeyword(st, 'unplayable')) spendable += st.cost;
  }
  v += Math.min(s.light, spendable) * 1.5;
  return v;
}

/** The action the auto-player would take. Null when the fight is over. */
export function chooseCardAction(s: CardBattleState): CardAction | null {
  if (s.over) return null;
  let best: CardAction = { type: 'end' };
  let bestScore = evaluate(s);
  for (const a of legalActions(s)) {
    if (a.type !== 'play') continue;
    const inst = s.hand.find((c) => c.uid === a.uid);
    if (!inst || !playable(s, inst)) continue;
    const next = cloneState(s);
    submitAction(next, a);
    const score = evaluate(next);
    if (score > bestScore + 1e-6) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}

/** Play a whole fight with the auto-player. Returns the final state. */
export function autoPlay(s: CardBattleState, maxActions = 400): CardBattleState {
  for (let i = 0; i < maxActions && !s.over; i++) {
    const a = chooseCardAction(s);
    if (!a) break;
    submitAction(s, a);
  }
  return s;
}
