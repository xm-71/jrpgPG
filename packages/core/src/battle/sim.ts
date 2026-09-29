import { Battle } from './engine';
import type { BattleSetup } from './defs';
import type { BattleEvent } from './events';
import { choosePartyAction } from './policy';
import type { BattleResult, BattleState, BattleStats } from './state';
import { GAUGE_MAX, LANTERN_MAX } from './constants';

export interface PlayoutResult {
  result: BattleResult | null;
  /** Party turns taken (a chain counts once). */
  turns: number;
  /** Inputs submitted, including Encores, passes and ultimates. */
  actions: number;
  stats: BattleStats;
  events: BattleEvent[];
  /** Fraction of party max HP remaining at the end. */
  partyHpFrac: number;
  timedOut: boolean;
}

export interface PlayoutOptions {
  keepEvents?: boolean;
  maxActions?: number;
  /** Called after every input, e.g. to check invariants. */
  onStep?: (battle: Battle) => void;
}

/** Play a battle to the end with the heuristic policy. Deterministic for a given setup and seed. */
export function playout(setup: BattleSetup, seed: string | number, opts: PlayoutOptions = {}): PlayoutResult {
  const battle = Battle.create(setup, seed);
  const keep = opts.keepEvents === true;
  const events: BattleEvent[] = keep ? [...battle.initialEvents] : [];
  const maxActions = opts.maxActions ?? 3000;
  let actions = 0;
  let timedOut = false;
  while (!battle.over) {
    if (actions >= maxActions) {
      timedOut = true;
      break;
    }
    const action = choosePartyAction(battle.state);
    if (!action) break;
    const produced = battle.submit(action);
    if (keep) events.push(...produced);
    actions++;
    opts.onStep?.(battle);
  }
  const party = battle.state.units.filter((u) => u.side === 'party');
  const max = party.reduce((sum, u) => sum + u.maxHp, 0);
  const hp = party.reduce((sum, u) => sum + u.hp, 0);
  return {
    result: battle.state.result,
    turns: battle.state.stats.turns,
    actions,
    stats: battle.state.stats,
    events,
    partyHpFrac: max > 0 ? hp / max : 0,
    timedOut: timedOut || battle.state.awaiting.type !== 'over',
  };
}

/** Rule violations in a battle state. An empty list means the state is sound. */
export function checkInvariants(s: BattleState): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const u of s.units) {
    if (ids.has(u.id)) problems.push(`duplicate id ${u.id}`);
    ids.add(u.id);
    if (!Number.isFinite(u.nextAt)) problems.push(`${u.id}: nextAt is not finite`);
    if (!Number.isFinite(u.hp) || u.hp < 0 || u.hp > u.maxHp) problems.push(`${u.id}: hp ${u.hp} outside 0..${u.maxHp}`);
    if (u.shell < 0 || u.shell > u.maxShell) problems.push(`${u.id}: shell ${u.shell} outside 0..${u.maxShell}`);
    if (u.gauge < 0 || u.gauge > GAUGE_MAX + 1e-9) problems.push(`${u.id}: gauge ${u.gauge} outside 0..${GAUGE_MAX}`);
    if (u.alive !== u.hp > 0) problems.push(`${u.id}: alive flag disagrees with hp`);
    if (u.broken && u.maxShell === 0) problems.push(`${u.id}: broken without a shell`);
    if (u.broken && u.shell !== 0) problems.push(`${u.id}: broken but shell is ${u.shell}`);
    if (u.hardened && (u.broken || u.maxShell === 0)) problems.push(`${u.id}: hardened while broken or shell-less`);
    if (!u.alive && u.intent) problems.push(`${u.id}: dead unit still has an intent`);
    for (const m of u.mods) if (m.turns <= 0) problems.push(`${u.id}: expired mod ${m.key} still active`);
  }
  if (s.lantern < 0 || s.lantern > LANTERN_MAX) problems.push(`lantern ${s.lantern} outside 0..${LANTERN_MAX}`);
  if (s.awaiting.type === 'input') {
    const actor = s.units.find((u) => u.id === (s.awaiting as { actor: string }).actor);
    if (!actor || !actor.alive || actor.side !== 'party') problems.push('awaiting a party unit that cannot act');
    if (!s.chain) problems.push('awaiting input without a chain');
  }
  if (s.chain) {
    if (new Set(s.chain.used).size !== s.chain.used.length) problems.push('a unit appears twice in the chain');
    if (s.chain.passCount !== s.chain.used.length - 1) problems.push('pass count does not match units used');
  }
  if (s.awaiting.type === 'over' && !s.result) problems.push('battle over without a result');
  return problems;
}
