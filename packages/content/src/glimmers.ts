import type { GlimmerDef } from '@duskline/core';

/**
 * Glimmers: boons picked after each Descent battle. They belong to three Paths, named for the
 * regions of Hesper. Taking Glimmers from a Path makes more of that Path turn up.
 */
export const GLIMMERS: readonly GlimmerDef[] = [
  // Noonward: hit harder, break faster.
  { id: 'sunstruck', name: 'Sunstruck', path: 'noonward', rarity: 1, text: 'Party ATK +10%.', passives: [{ type: 'stat', stat: 'atk', pct: 0.1 }] },
  { id: 'whetted-edge', name: 'Whetted Edge', path: 'noonward', rarity: 2, text: 'Party ATK +16%.', passives: [{ type: 'stat', stat: 'atk', pct: 0.16 }] },
  { id: 'overture', name: 'Overture', path: 'noonward', rarity: 2, text: 'Start every battle with 30 ultimate charge.', passives: [{ type: 'startGauge', value: 30 }] },
  { id: 'long-shadows', name: 'Long Shadows', path: 'noonward', rarity: 2, text: 'Horizon Burst deals 25% more damage.', passives: [{ type: 'burstDamage', value: 0.25 }] },
  { id: 'breakers-mark', name: "Breaker's Mark", path: 'noonward', rarity: 3, text: 'Weakness hits remove 1 more Shell.', passives: [{ type: 'shellBonus', value: 1 }] },
  { id: 'encore-fever', name: 'Encore!', path: 'noonward', rarity: 3, text: 'Encore and passed actions deal 20% more damage.', passives: [{ type: 'encoreDamage', value: 0.2 }] },

  // Duskward: tempo and balance.
  { id: 'quickening', name: 'Quickening', path: 'duskward', rarity: 1, text: 'Party SPD +6%.', passives: [{ type: 'stat', stat: 'spd', pct: 0.06 }] },
  { id: 'deep-breath', name: 'Deep Breath', path: 'duskward', rarity: 1, text: 'Start every battle with 1 more Lantern.', passives: [{ type: 'startLantern', value: 1 }] },
  { id: 'second-wind', name: 'Second Wind', path: 'duskward', rarity: 2, text: 'Breaking an enemy heals the party for 4% of max HP.', passives: [{ type: 'breakHeal', value: 0.04 }] },
  { id: 'trade-winds', name: 'Trade Winds', path: 'duskward', rarity: 2, text: 'Ultimates charge 20% faster.', passives: [{ type: 'gaugeGain', value: 0.2 }] },
  { id: 'long-stride', name: 'Long Stride', path: 'duskward', rarity: 2, text: 'Party SPD +10%.', passives: [{ type: 'stat', stat: 'spd', pct: 0.1 }] },
  {
    id: 'two-lanterns',
    name: 'Two Lanterns',
    path: 'duskward',
    rarity: 3,
    text: 'Start every battle with 2 more Lantern and 20 ultimate charge.',
    passives: [
      { type: 'startLantern', value: 2 },
      { type: 'startGauge', value: 20 },
    ],
  },

  // Nightward: endure and control.
  { id: 'iron-lantern', name: 'Iron Lantern', path: 'nightward', rarity: 1, text: 'Party DEF +12%.', passives: [{ type: 'stat', stat: 'def', pct: 0.12 }] },
  { id: 'hearthglow', name: 'Hearthglow', path: 'nightward', rarity: 1, text: 'Party max HP +12%.', passives: [{ type: 'stat', stat: 'hp', pct: 0.12 }] },
  { id: 'patient-hands', name: 'Patient Hands', path: 'nightward', rarity: 2, text: 'Guarding blocks 15% more damage.', passives: [{ type: 'guardPower', value: 0.15 }] },
  { id: 'second-chorus', name: 'Second Chorus', path: 'nightward', rarity: 2, text: 'Healing is 25% stronger.', passives: [{ type: 'healPower', value: 0.25 }] },
  {
    id: 'bastion',
    name: 'Bastion',
    path: 'nightward',
    rarity: 2,
    text: 'Party DEF +18% and max HP +8%.',
    passives: [
      { type: 'stat', stat: 'def', pct: 0.18 },
      { type: 'stat', stat: 'hp', pct: 0.08 },
    ],
  },
  {
    id: 'dawn-vow',
    name: 'Dawn Vow',
    path: 'nightward',
    rarity: 3,
    text: 'Party max HP +20%, and breaking an enemy heals 5% of max HP.',
    passives: [
      { type: 'stat', stat: 'hp', pct: 0.2 },
      { type: 'breakHeal', value: 0.05 },
    ],
  },
];
