import type { Affinity } from '../types';
import { cardStats, type CardDef, type CardEffect, type FoeMove, type Keyword, type Passive, type StatusId } from './defs';

/** Plain-language rules text. The client shows it and the tests check every card has some. */

export const STATUS_NAME: Record<StatusId, string> = {
  burn: 'Burn',
  chill: 'Chill',
  hex: 'Hex',
  shock: 'Shock',
  rage: 'Rage',
  dim: 'Dim',
};

export const STATUS_HELP: Record<StatusId, string> = {
  burn: 'Takes that much damage at the start of its turn, then Burn falls by 1.',
  chill: 'Deals 25% less damage. Wears off by 1 each turn.',
  hex: 'Takes 25% more damage. Wears off by 1 each turn.',
  shock: 'The next hit it takes deals that much more.',
  rage: 'Deals that much more with every hit.',
  dim: 'That much less Light next turn.',
};

export const KEYWORD_HELP: Record<Keyword, string> = {
  fleeting: 'Gone at the end of the turn if you still hold it. It cannot ward.',
  spent: 'Played once per fight, then set aside.',
  unplayable: 'Cannot be played. Thrown away at the end of the turn.',
  pierce: 'Ignores ward.',
  linked: 'Continues any Chain, whatever its affinity.',
  steadfast: 'Stays in your hand after it wards.',
};

export const KEYWORD_NAME: Record<Keyword, string> = {
  fleeting: 'Fleeting',
  spent: 'Spent',
  unplayable: 'Unplayable',
  pierce: 'Pierce',
  linked: 'Linked',
  steadfast: 'Steadfast',
};

export const AFFINITY_NAME: Record<Affinity, string> = {
  sun: 'Sun',
  moon: 'Moon',
  flame: 'Flame',
  frost: 'Frost',
  gale: 'Gale',
  volt: 'Volt',
};

function effectText(e: CardEffect, target: CardDef['target']): string {
  switch (e.type) {
    case 'status': {
      const on = e.on ?? (target === 'self' ? 'self' : target === 'allFoes' ? 'allFoes' : 'target');
      const what = `${e.stacks} ${STATUS_NAME[e.status]}`;
      if (on === 'self') return `Gain ${what}.`;
      if (on === 'allFoes') return `Apply ${what} to all foes.`;
      return `Apply ${what}.`;
    }
    case 'heal':
      return `Heal ${e.amount}.`;
    case 'draw':
      return e.count === 1 ? 'Draw a card.' : `Draw ${e.count} cards.`;
    case 'light':
      return `Gain ${e.amount} Light.`;
    case 'ward':
      return `Gain ${e.amount} ward now.`;
    case 'crack':
      return target === 'allFoes' ? `Crack ${e.amount} Shell on all foes.` : `Crack ${e.amount} Shell.`;
    case 'gauge':
      return `+${e.amount} ultimate charge.`;
    case 'cleanse':
      return 'Clear your Chill, Hex, Dim and Burn.';
  }
}

/** What a card does when played, one sentence per part. Ward-while-held is shown separately. */
export function cardLines(def: CardDef, up = false): string[] {
  const st = cardStats(def, up);
  const out: string[] = [];
  if (st.atk > 0 && def.target !== 'self') {
    const hits = st.hits > 1 ? ` ×${st.hits}` : '';
    out.push(def.target === 'allFoes' ? `Deal ${st.atk}${hits} to all foes.` : `Deal ${st.atk}${hits}.`);
  }
  for (const e of st.effects) out.push(effectText(e, def.target));
  if (out.length === 0 && def.kind === 'guard') out.push('Hold it to ward.');
  return out;
}

export function cardText(def: CardDef, up = false): string {
  const st = cardStats(def, up);
  const kw = st.keywords.map((k) => KEYWORD_NAME[k]);
  return [...kw.map((k) => `${k}.`), ...cardLines(def, up)].join(' ');
}

/** A short description of a foe's move for the intent badge and its tooltip. */
export function moveLines(m: FoeMove, perHit: number): string[] {
  const out: string[] = [];
  if (m.shatter) out.push('Breaks the ward of your best held card.');
  if (m.dmg) out.push(`Attacks for ${perHit}${(m.hits ?? 1) > 1 ? ` ×${m.hits}` : ''}${m.pierce ? ', through ward' : ''}.`);
  if (m.afflict) out.push(`Gives you ${m.afflict.stacks} ${STATUS_NAME[m.afflict.status]}.`);
  if (m.ward) out.push('Wards itself.');
  if (m.wardAll) out.push('Wards the whole pack.');
  if (m.rage) out.push(`Gains ${m.rage} Rage.`);
  if (m.rageAll) out.push(`The pack gains ${m.rageAll} Rage.`);
  if (m.heal) out.push('Heals itself.');
  if (m.healAll) out.push('Heals the pack.');
  if (m.curse) out.push(`Adds ${m.curse} Ash to your discard pile.`);
  if (m.summon) out.push('Calls another Fade.');
  if (out.length === 0) out.push('Waits.');
  return out;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Plain-language description of a passive, for hero traits and Glimmers. */
export function passiveText(p: Passive): string {
  switch (p.type) {
    case 'maxHp':
      return `+${p.value} max HP.`;
    case 'maxLight':
      return `+${p.value} Light every turn.`;
    case 'handLimit':
      return `Hold up to ${p.value} more card${p.value === 1 ? '' : 's'}.`;
    case 'damage':
      return `Deal ${pct(p.pct)} more damage.`;
    case 'affinityDamage':
      return `${AFFINITY_NAME[p.affinity]} cards deal ${pct(p.pct)} more damage.`;
    case 'heldWard':
      return `Every card you hold wards ${p.value} more.`;
    case 'startWard':
      return `Start every fight with ${p.value} ward.`;
    case 'firstStrike':
      return `The first card you play each turn deals ${p.value} more per hit.`;
    case 'breakDraw':
      return `Breaking a foe draws ${p.value} more card${p.value === 1 ? '' : 's'}.`;
    case 'breakHeal':
      return `Breaking a foe heals you ${p.value}.`;
    case 'breakWard':
      return `Breaking a foe gives you ${p.value} ward.`;
    case 'shellBonus':
      return `Weakness hits chip ${p.value} more Shell.`;
    case 'chainBonus':
      return `Each Chain step adds ${pct(p.pct)} more damage.`;
    case 'gaugeGain':
      return `Your ultimate charges ${pct(p.pct)} faster.`;
    case 'startGauge':
      return `Start every fight with ${p.value} ultimate charge.`;
    case 'healPower':
      return `Healing is ${pct(p.pct)} stronger.`;
    case 'startStatus':
      return `Foes start every fight with ${p.stacks} ${STATUS_NAME[p.status]}.`;
    case 'burnPower':
      return `Burn you apply is ${p.value} stronger.`;
    case 'openingLight':
      return `+${p.value} Light on the first turn of a fight.`;
    case 'openingDraw':
      return `Draw ${p.value} more on the first turn of a fight.`;
    case 'victoryHeal':
      return `Heal ${p.value} after every fight you win.`;
    case 'emberGain':
      return `Win ${pct(p.pct)} more Embers.`;
  }
}
