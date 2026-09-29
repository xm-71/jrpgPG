import type { EncounterDef, StratumDef } from '@duskline/core';

/**
 * The Gnomon, in three strata of three floors. Each floor is a branching map that ends in a
 * guardian; the third floor ends in the stratum's boss. Deeper strata scale every Fade up.
 */

export const ENCOUNTERS: readonly EncounterDef[] = [
  // The Root
  { id: 'r.wisps', name: 'Two Wisps', foes: [{ foe: 'wisp' }, { foe: 'wisp' }] },
  { id: 'r.hound', name: 'A Hush Hound', foes: [{ foe: 'hound', hp: 1.2 }] },
  { id: 'r.moths', name: 'Moths at the Lamp', foes: [{ foe: 'moth' }, { foe: 'moth' }, { foe: 'moth' }] },
  { id: 'r.acolyte', name: 'An Acolyte and its Candle', foes: [{ foe: 'acolyte' }, { foe: 'wisp' }] },
  { id: 'r.hounds', name: 'The Pack', foes: [{ foe: 'hound' }, { foe: 'hound' }] },
  { id: 'r.wraith', name: 'A Wraith and a Wisp', foes: [{ foe: 'wraith' }, { foe: 'wisp' }] },
  { id: 'r.acolytes', name: 'Two Acolytes', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }] },
  { id: 'r.mixed', name: 'Moth and Hound', foes: [{ foe: 'moth' }, { foe: 'hound' }] },
  { id: 'r.wraiths', name: 'Two Wraiths', foes: [{ foe: 'wraith' }, { foe: 'wraith' }] },
  { id: 'r.choir', name: 'A Choir and its Moth', foes: [{ foe: 'choir' }, { foe: 'moth' }] },
  { id: 'r.pack', name: 'The Pack and its Light', foes: [{ foe: 'hound' }, { foe: 'hound' }, { foe: 'wisp' }] },
  { id: 'r.cult', name: 'A Small Congregation', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }, { foe: 'moth' }] },
  { id: 'r.husk', name: 'Door Husk', foes: [{ foe: 'husk' }] },
  { id: 'r.static', name: 'Static Knight', foes: [{ foe: 'static' }] },
  { id: 'r.g1', name: 'The Door on the First Landing', foes: [{ foe: 'husk', hp: 0.85 }] },
  { id: 'r.g2', name: 'The Knight of the Second Landing', foes: [{ foe: 'static', hp: 0.85 }, { foe: 'wisp' }] },
  { id: 'r.boss', name: 'The Warden', foes: [{ foe: 'warden' }], summons: ['moth'] },

  // The Hollow
  { id: 'h.wraiths', name: 'Two Wraiths', foes: [{ foe: 'wraith' }, { foe: 'wraith' }] },
  { id: 'h.choir', name: 'Choir and Wisp', foes: [{ foe: 'choir' }, { foe: 'wisp' }] },
  { id: 'h.moths', name: 'A Cloud of Moths', foes: [{ foe: 'moth' }, { foe: 'moth' }, { foe: 'moth' }] },
  { id: 'h.hounds', name: 'Two Hounds', foes: [{ foe: 'hound', hp: 1.1 }, { foe: 'hound', hp: 1.1 }] },
  { id: 'h.chorus', name: 'Two Choirs', foes: [{ foe: 'choir' }, { foe: 'choir' }] },
  { id: 'h.cult', name: 'The Wraith’s Congregation', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }, { foe: 'wraith' }] },
  { id: 'h.static', name: 'A Knight and its Moth', foes: [{ foe: 'static', hp: 0.7 }, { foe: 'moth' }] },
  { id: 'h.mix', name: 'Wraith, Hound and Moth', foes: [{ foe: 'wraith' }, { foe: 'hound' }, { foe: 'moth' }] },
  { id: 'h.knights', name: 'Two Knights', foes: [{ foe: 'static', hp: 0.65 }, { foe: 'static', hp: 0.65 }] },
  { id: 'h.husks', name: 'A Husk and its Keeper', foes: [{ foe: 'husk', hp: 0.8 }, { foe: 'acolyte' }] },
  { id: 'h.dark', name: 'The Dark Choir', foes: [{ foe: 'wraith' }, { foe: 'wraith' }, { foe: 'choir' }] },
  { id: 'h.cult2', name: 'Three Acolytes', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }, { foe: 'acolyte' }] },
  { id: 'h.husk', name: 'Door Husk and Moth', foes: [{ foe: 'husk' }, { foe: 'moth' }] },
  { id: 'h.stat', name: 'Static Knight and Wisp', foes: [{ foe: 'static' }, { foe: 'wisp' }] },
  { id: 'h.g1', name: 'The Paper Chapel', foes: [{ foe: 'choir', hp: 1.4 }, { foe: 'choir' }] },
  { id: 'h.g2', name: 'The Barred Door', foes: [{ foe: 'husk' }, { foe: 'static', hp: 0.6 }] },
  { id: 'h.boss', name: 'The Tolling Bell', foes: [{ foe: 'bell' }], summons: ['choir'] },

  // The Crown
  { id: 'c.wraiths', name: 'The Veiled', foes: [{ foe: 'wraith' }, { foe: 'moth' }] },
  { id: 'c.choir', name: 'The Choir Loft', foes: [{ foe: 'choir' }, { foe: 'wisp' }] },
  { id: 'c.cult', name: 'The Faithful', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }] },
  { id: 'c.pack', name: 'The Last Pack', foes: [{ foe: 'hound', hp: 1.1 }, { foe: 'hound', hp: 1.1 }] },
  { id: 'c.knight', name: 'Knight Errant', foes: [{ foe: 'static', hp: 0.75 }, { foe: 'wraith' }] },
  { id: 'c.doors', name: 'Doors in the Dark', foes: [{ foe: 'husk', hp: 0.7 }, { foe: 'moth' }, { foe: 'moth' }] },
  { id: 'c.mass', name: 'Midnight Mass', foes: [{ foe: 'acolyte' }, { foe: 'choir' }, { foe: 'wraith' }] },
  { id: 'c.storm', name: 'Storm on the Stair', foes: [{ foe: 'static', hp: 0.65 }, { foe: 'hound' }, { foe: 'hound' }] },
  { id: 'c.trio', name: 'The Last Congregation', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }, { foe: 'acolyte' }] },
  { id: 'c.husk', name: 'The Great Door', foes: [{ foe: 'husk', hp: 1.2 }, { foe: 'acolyte' }] },
  { id: 'c.static', name: 'The Honour Guard', foes: [{ foe: 'static' }, { foe: 'static', hp: 0.6 }] },
  { id: 'c.g1', name: 'The Congregation', foes: [{ foe: 'acolyte', hp: 1.3 }, { foe: 'acolyte', hp: 1.3 }, { foe: 'choir' }] },
  { id: 'c.g2', name: 'The Gate of Hours', foes: [{ foe: 'husk' }, { foe: 'static', hp: 0.8 }] },
  { id: 'c.boss', name: 'The Hour-Keeper', foes: [{ foe: 'keeper' }], summons: ['acolyte'] },

  // Fights that events can start
  { id: 'x.moths', name: 'The Swarm', foes: [{ foe: 'moth' }, { foe: 'moth' }, { foe: 'moth' }] },
  { id: 'x.acolytes', name: 'The Bell-ringers', foes: [{ foe: 'acolyte' }, { foe: 'acolyte' }] },
  { id: 'x.husk', name: 'Whatever Was Behind the Door', foes: [{ foe: 'husk', hp: 0.9 }] },
];

export const STRATA: readonly StratumDef[] = [
  {
    id: 'root',
    index: 0,
    name: 'The Root',
    blurb: 'Where the Gnomon meets the ground: cellars, furnace halls and the first stair.',
    floors: [
      { battles: ['r.wisps', 'r.hound', 'r.moths', 'r.acolyte'], guardian: 'r.g1' },
      { battles: ['r.hounds', 'r.wraith', 'r.acolytes', 'r.mixed'], guardian: 'r.g2' },
      { battles: ['r.wraiths', 'r.choir', 'r.pack', 'r.cult'], guardian: 'r.boss' },
    ],
    elites: ['r.husk', 'r.static'],
    events: ['ev.survivor', 'ev.shrine', 'ev.stoker', 'ev.moths', 'ev.fade', 'ev.market', 'ev.well', 'ev.clock'],
    hpScale: 1,
    powerScale: 1,
  },
  {
    id: 'hollow',
    index: 1,
    name: 'The Hollow',
    blurb: 'The tower’s empty middle, where the Unturning built chapels in the dark and hung a bell.',
    floors: [
      { battles: ['h.wraiths', 'h.choir', 'h.moths', 'h.hounds'], guardian: 'h.g1' },
      { battles: ['h.chorus', 'h.cult', 'h.static', 'h.mix'], guardian: 'h.g2' },
      { battles: ['h.knights', 'h.husks', 'h.dark', 'h.cult2'], guardian: 'h.boss' },
    ],
    elites: ['h.husk', 'h.stat'],
    events: ['ev.survivor', 'ev.shrine', 'ev.hymnal', 'ev.ledger', 'ev.rope', 'ev.fade', 'ev.stair', 'ev.market'],
    hpScale: 1,
    powerScale: 1,
  },
  {
    id: 'crown',
    index: 2,
    name: 'The Crown',
    blurb: 'The top of the shadow. The sun is right there, and it does not move.',
    floors: [
      { battles: ['c.wraiths', 'c.choir', 'c.cult', 'c.pack'], guardian: 'c.g1' },
      { battles: ['c.knight', 'c.doors', 'c.mass', 'c.storm'], guardian: 'c.g2' },
      { battles: ['c.mass', 'c.storm', 'c.doors', 'c.trio'], guardian: 'c.boss' },
    ],
    elites: ['c.husk', 'c.static'],
    events: ['ev.shrine', 'ev.hymnal', 'ev.ledger', 'ev.rope', 'ev.stair', 'ev.well', 'ev.clock', 'ev.stoker'],
    hpScale: 1.1,
    powerScale: 1.08,
  },
];
