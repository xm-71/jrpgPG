import type { CardDef } from '@duskline/core';

/** Memory Cards: equippable illustrations with a small passive. Extra copies make them stronger. */
export const CARDS: readonly CardDef[] = [
  // 5-star
  {
    id: 'card.anchor-shadow',
    name: "The Anchor's Shadow",
    rarity: 5,
    blurb: "A rubbing of the Dominion's pillar. Its shadow is longer than it should be.",
    passives: [
      { type: 'stat', stat: 'atk', pct: 0.1 },
      { type: 'stat', stat: 'def', pct: 0.1 },
      { type: 'stat', stat: 'hp', pct: 0.1 },
    ],
    art: { hue: 262, glyph: 'anchor' },
  },
  {
    id: 'card.first-light',
    name: 'First Light, Framed',
    rarity: 5,
    blurb: 'The only picture of a sunrise anyone on the Duskline has ever seen. It is warm to hold.',
    passives: [
      { type: 'startGauge', value: 25 },
      { type: 'breakHeal', value: 0.05 },
    ],
    art: { hue: 42, glyph: 'sun' },
  },
  // 4-star
  {
    id: 'card.ledger',
    name: "Lamplighter's Ledger",
    rarity: 4,
    blurb: 'Every debt a Lamplighter has ever owed, in neat columns. Extra actions hit harder.',
    passives: [{ type: 'encoreDamage', value: 0.12 }],
    art: { hue: 332, glyph: 'ledger' },
  },
  {
    id: 'card.chime',
    name: 'Wind-Chime of Vesper',
    rarity: 4,
    blurb: 'It rings whenever the crew is in trouble. Ultimates charge faster.',
    passives: [{ type: 'gaugeGain', value: 0.12 }],
    art: { hue: 176, glyph: 'chime' },
  },
  {
    id: 'card.ribbon',
    name: 'Ember Ribbon',
    rarity: 4,
    blurb: 'Tied to a blade, it never quite stops glowing. Horizon Burst hits harder.',
    passives: [{ type: 'burstDamage', value: 0.15 }],
    art: { hue: 14, glyph: 'ribbon' },
  },
  {
    id: 'card.key',
    name: "Warden's Key",
    rarity: 4,
    blurb: 'Opens a door that no longer exists. Guarding softens more damage.',
    passives: [
      { type: 'guardPower', value: 0.15 },
      { type: 'stat', stat: 'hp', pct: 0.06 },
    ],
    art: { hue: 204, glyph: 'key' },
  },
  // 3-star
  {
    id: 'card.worn-lantern',
    name: 'Worn Lantern',
    rarity: 3,
    blurb: 'Dented, sooty, still warm.',
    passives: [{ type: 'stat', stat: 'hp', pct: 0.06 }],
    art: { hue: 36, glyph: 'lantern' },
  },
  {
    id: 'card.patchwork-coat',
    name: 'Patchwork Coat',
    rarity: 3,
    blurb: 'Every patch is from a different Turning.',
    passives: [{ type: 'stat', stat: 'def', pct: 0.06 }],
    art: { hue: 300, glyph: 'coat' },
  },
  {
    id: 'card.rusty-compass',
    name: 'Rusty Compass',
    rarity: 3,
    blurb: 'It points at whatever you were about to say.',
    passives: [{ type: 'stat', stat: 'spd', pct: 0.04 }],
    art: { hue: 190, glyph: 'compass' },
  },
  {
    id: 'card.salt-biscuit',
    name: 'Salt Biscuit',
    rarity: 3,
    blurb: 'Vesper ration. Hard as a hull plate. Surprisingly motivating.',
    passives: [{ type: 'stat', stat: 'atk', pct: 0.05 }],
    art: { hue: 26, glyph: 'biscuit' },
  },
  {
    id: 'card.tin-whistle',
    name: 'Tin Whistle',
    rarity: 3,
    blurb: 'One shrill note. Starts the fight with a little ultimate charge.',
    passives: [{ type: 'startGauge', value: 10 }],
    art: { hue: 212, glyph: 'whistle' },
  },
];
