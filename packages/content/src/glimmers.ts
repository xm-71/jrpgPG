import type { GlimmerDef } from '@duskline/core';

/**
 * Glimmers: boons that last one climb. They belong to three Paths, named for the regions of Hesper.
 * Taking Glimmers from a Path makes more of that Path turn up.
 */
export const GLIMMERS: readonly GlimmerDef[] = [
  // Noonward: hit harder, break faster.
  { id: 'sunstruck', name: 'Sunstruck', path: 'noonward', rarity: 1, text: 'Deal 10% more damage.', passives: [{ type: 'damage', pct: 0.1 }] },
  { id: 'whetted-edge', name: 'Whetted Edge', path: 'noonward', rarity: 1, text: 'The first card you play each turn deals 3 more per hit.', passives: [{ type: 'firstStrike', value: 3 }] },
  { id: 'overture', name: 'Overture', path: 'noonward', rarity: 2, text: 'Start every fight with 50 ultimate charge.', passives: [{ type: 'startGauge', value: 50 }] },
  { id: 'long-shadows', name: 'Long Shadows', path: 'noonward', rarity: 2, text: 'Each Chain step adds 10% more damage.', passives: [{ type: 'chainBonus', pct: 0.1 }] },
  { id: 'breakers-mark', name: "Breaker's Mark", path: 'noonward', rarity: 3, text: 'Weakness hits chip 1 more Shell.', passives: [{ type: 'shellBonus', value: 1 }] },
  { id: 'encore-fever', name: 'Encore!', path: 'noonward', rarity: 3, text: 'Breaking a foe draws 2 more cards.', passives: [{ type: 'breakDraw', value: 2 }] },

  // Duskward: tempo.
  { id: 'quickening', name: 'Quickening', path: 'duskward', rarity: 1, text: 'Draw 1 more card on the first turn of a fight.', passives: [{ type: 'openingDraw', value: 1 }] },
  { id: 'deep-breath', name: 'Deep Breath', path: 'duskward', rarity: 1, text: '+2 Light on the first turn of a fight.', passives: [{ type: 'openingLight', value: 2 }] },
  { id: 'second-wind', name: 'Second Wind', path: 'duskward', rarity: 2, text: 'Breaking a foe heals you 4.', passives: [{ type: 'breakHeal', value: 4 }] },
  { id: 'trade-winds', name: 'Trade Winds', path: 'duskward', rarity: 2, text: 'Your ultimate charges 30% faster.', passives: [{ type: 'gaugeGain', pct: 0.3 }] },
  { id: 'long-stride', name: 'Long Stride', path: 'duskward', rarity: 3, text: 'Hold up to 1 more card.', passives: [{ type: 'handLimit', value: 1 }] },
  { id: 'two-lanterns', name: 'Two Lanterns', path: 'duskward', rarity: 3, text: '+1 Light every turn.', passives: [{ type: 'maxLight', value: 1 }] },

  // Nightward: endure.
  { id: 'iron-lantern', name: 'Iron Lantern', path: 'nightward', rarity: 1, text: 'Every card you hold wards 1 more.', passives: [{ type: 'heldWard', value: 1 }] },
  { id: 'hearthglow', name: 'Hearthglow', path: 'nightward', rarity: 1, text: '+10 max HP.', passives: [{ type: 'maxHp', value: 10 }] },
  { id: 'patient-hands', name: 'Patient Hands', path: 'nightward', rarity: 2, text: 'Start every fight with 8 ward.', passives: [{ type: 'startWard', value: 8 }] },
  {
    id: 'second-chorus',
    name: 'Second Chorus',
    path: 'nightward',
    rarity: 2,
    text: 'Healing is 30% stronger, and you heal 3 after every fight you win.',
    passives: [
      { type: 'healPower', pct: 0.3 },
      { type: 'victoryHeal', value: 3 },
    ],
  },
  {
    id: 'bastion',
    name: 'Bastion',
    path: 'nightward',
    rarity: 2,
    text: 'Every card you hold wards 1 more. +5 max HP.',
    passives: [
      { type: 'heldWard', value: 1 },
      { type: 'maxHp', value: 5 },
    ],
  },
  {
    id: 'dawn-vow',
    name: 'Dawn Vow',
    path: 'nightward',
    rarity: 3,
    text: '+15 max HP, and you heal 5 after every fight you win.',
    passives: [
      { type: 'maxHp', value: 15 },
      { type: 'victoryHeal', value: 5 },
    ],
  },
];
