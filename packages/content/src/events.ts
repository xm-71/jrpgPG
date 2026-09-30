import type { EventDef } from '@duskline/core';

/**
 * Things that happen on the stairs. Every choice says plainly what it costs and what it might give;
 * the risk is in chance rolls, never in hidden rules.
 */
export const EVENTS: readonly EventDef[] = [
  {
    id: 'ev.survivor',
    title: 'A Trapped Stoker',
    text: 'A stoker from Vesper is pinned under a fallen stair, still holding a shovel of coal that went out an hour ago. “I heard the Fades go past,” they whisper. “They did not see me. I think they only see lamps.”',
    choices: [
      { label: 'Dig them out', hint: 'Lose 6 HP. Gain a random uncommon card.', cost: { hp: 6 }, outcome: [{ type: 'randomCard', tier: 'uncommon' }], after: 'Your hands bleed on the stone. When they are free, they press something into your palm and run downstairs without looking back.' },
      { label: 'Leave them your spare wick', hint: 'Pay 15 Embers. +5 max HP.', cost: { embers: 15 }, outcome: [{ type: 'maxHp', amount: 5 }], after: '“Light it when you get to the top,” they say. You feel steadier for having been asked.' },
      { label: 'Keep climbing', hint: 'Nothing happens.', outcome: [], after: 'You tell yourself someone else will come. Someone always comes.' },
    ],
  },
  {
    id: 'ev.shrine',
    title: 'The Shrine of Mirrors',
    text: 'A thousand hand mirrors hang from the ceiling on threads. Each shows the same stair at a different hour. One of them shows you, fighting, in a way you have not fought yet.',
    choices: [
      { label: 'Look into the Ninth Hour', hint: 'The tower offers an Echo of how you fight.', outcome: [{ type: 'echo' }], after: 'The glass fogs, then clears. Something in it is holding a card out to you.' },
      {
        label: 'Break one',
        hint: 'Half the time, 40 Embers. Otherwise, an Ash card in your deck.',
        outcome: [{ type: 'chance', p: 0.5, win: [{ type: 'embers', amount: 40 }], lose: [{ type: 'curse', count: 1 }], winText: 'Embers spill out of the frame, as if it had been holding them for you.', loseText: 'The shards whisper a hymn. Some of it stays with you.' }],
        after: 'Glass everywhere.',
      },
      { label: 'Walk past with your eyes down', hint: 'Nothing happens.', outcome: [], after: 'A thousand reflections do not watch you go.' },
    ],
  },
  {
    id: 'ev.stoker',
    title: 'A Furnace Still Burning',
    text: 'Somebody has kept this furnace lit. There is a chair beside it, a mug, and a whetstone, and nobody at all.',
    choices: [
      { label: 'Warm your hands', hint: 'Heal 12 HP.', outcome: [{ type: 'hp', amount: 12 }], after: 'The warmth gets into your bones. You had forgotten how cold the stair was.' },
      { label: 'Temper a card', hint: 'Choose a card to temper.', outcome: [{ type: 'pick', mode: 'upgrade' }], after: 'The whetstone is warm, like someone just put it down.' },
      { label: 'Feed it your Embers', hint: 'Pay 30 Embers. Choose a Glimmer.', cost: { embers: 30 }, outcome: [{ type: 'glimmer' }], after: 'The fire goes white, then gold, and something in it comes to you.' },
    ],
  },
  {
    id: 'ev.moths',
    title: 'The Swarm',
    text: 'The stairwell ahead is full of moths, thousands of them, every one turned toward your lamp.',
    choices: [
      { label: 'Shutter your lantern and wait', hint: 'Lose 4 HP in the dark.', outcome: [{ type: 'hp', amount: -4 }], after: 'They pass over you like a tide of paper. Something bites. Then they are gone.' },
      { label: 'Push through them', hint: 'A fight with three Lamp Moths.', outcome: [{ type: 'fight', encounter: 'x.moths' }], after: 'You raise the lamp. They come.' },
      { label: 'Let them drink a little', hint: '−4 max HP. Temper 2 random cards.', outcome: [{ type: 'maxHp', amount: -4 }, { type: 'upgradeRandom', count: 2 }], after: 'They drink from the lamp and from you. When they leave, your cards are sharper for it.' },
    ],
  },
  {
    id: 'ev.fade',
    title: 'A Fade That Remembers',
    text: 'A small Fade sits on the landing, hugging its knees. It is trying very hard to remember whose shadow it was.',
    choices: [
      { label: 'Help it remember', hint: 'Lose 5 HP. Gain a random rare card.', cost: { hp: 5 }, outcome: [{ type: 'randomCard', tier: 'rare' }], after: 'You describe faces until one of them makes it smile. It leaves you something as it fades out for good.' },
      { label: 'Bind it to paper', hint: 'Gain a Bound Wraith.', outcome: [{ type: 'card', card: 'bound.wraith' }], after: 'It does not resist. It seems relieved to belong to someone.' },
      { label: 'Sit with it a while', hint: 'Heal 6 HP.', outcome: [{ type: 'hp', amount: 6 }], after: 'Neither of you says anything. It helps, somehow.' },
    ],
  },
  {
    id: 'ev.market',
    title: 'The Ghost Market',
    text: 'Stalls line a landing that should be empty. The merchants have no faces and very good prices.',
    choices: [
      { label: 'Buy a charm', hint: 'Pay 45 Embers. Choose a Glimmer.', cost: { embers: 45 }, outcome: [{ type: 'glimmer' }], after: 'The merchant wraps it in a page torn from a hymnal.' },
      { label: 'Sell a card', hint: 'Remove a card from your deck. Gain 30 Embers.', outcome: [{ type: 'embers', amount: 30 }, { type: 'pick', mode: 'remove' }], after: '“We buy memories,” says the merchant. “Only the ones you will not miss.”' },
      { label: 'Just look', hint: 'Nothing happens.', outcome: [], after: 'Everything is very beautiful and nothing is for you.' },
    ],
  },
  {
    id: 'ev.well',
    title: 'A Well of Echoes',
    text: 'A well in the middle of a stair, which should not be possible. When you speak into it, it answers in your voice, a little later than it should.',
    choices: [
      { label: 'Drop in an Ember', hint: 'Pay 20 Embers. The well offers an Echo.', cost: { embers: 20 }, outcome: [{ type: 'echo' }], after: 'The Ember falls for a long time. What comes back up is a card.' },
      { label: 'Drink', hint: 'Heal 10 HP. Add an Ash card to your deck.', outcome: [{ type: 'hp', amount: 10 }, { type: 'curse', count: 1 }], after: 'It tastes of every hymn ever sung in the tower.' },
      { label: 'Leave it be', hint: 'Nothing happens.', outcome: [], after: 'Behind you, the well says “leave it be” one more time.' },
    ],
  },
  {
    id: 'ev.clock',
    title: 'The Stopped Clock',
    text: 'A grandfather clock stands in the stair, stopped at the same hour as the sun. Its key is still in it.',
    choices: [
      { label: 'Wind it', hint: 'Lose 8 HP. Temper 3 random cards.', cost: { hp: 8 }, outcome: [{ type: 'upgradeRandom', count: 3 }], after: 'The spring fights you the whole way. For one tick, everything in the tower moves.' },
      { label: 'Break the glass', hint: 'Gain 35 Embers.', outcome: [{ type: 'embers', amount: 35 }], after: 'Behind the face, someone hid their savings. They will not need them now.' },
      { label: 'Leave it stopped', hint: 'Nothing happens.', outcome: [], after: 'It is not your hour to change. Not yet.' },
    ],
  },
  {
    id: 'ev.hymnal',
    title: 'The Unturning Hymnal',
    text: 'A hymnal lies open on a lectern, in a hand you do not know. The hymns ask for nothing to ever change again.',
    choices: [
      { label: 'Read it aloud', hint: 'Temper 2 random cards. Add an Ash card to your deck.', outcome: [{ type: 'upgradeRandom', count: 2 }, { type: 'curse', count: 1 }], after: 'The words are powerful and wrong. Some of the power stays with you, and some of the wrong.' },
      { label: 'Burn it', hint: 'Gain 25 Embers.', outcome: [{ type: 'embers', amount: 25 }], after: 'It burns slowly, like it is arguing.' },
      { label: 'Close it', hint: 'Nothing happens.', outcome: [], after: 'You close the book. The lectern sighs.' },
    ],
  },
  {
    id: 'ev.ledger',
    title: 'The Register of the Stilled',
    text: 'A ledger of every name the Unturning has sworn to keep still forever. There is a space at the bottom for one more.',
    choices: [
      { label: 'Strike a name out', hint: 'Lose 4 HP. Remove a card from your deck.', cost: { hp: 4 }, outcome: [{ type: 'pick', mode: 'remove' }], after: 'The ink fights your pen. Somewhere, someone takes a breath for the first time in years.' },
      { label: 'Write your own name', hint: '+6 max HP. Add an Ash card to your deck.', outcome: [{ type: 'maxHp', amount: 6 }, { type: 'curse', count: 1 }], after: 'You feel sturdier, and a little less like yourself.' },
      { label: 'Leave it', hint: 'Nothing happens.', outcome: [], after: 'The ledger does not need your permission. That is the frightening part.' },
    ],
  },
  {
    id: 'ev.rope',
    title: 'A Bell Rope',
    text: 'A rope hangs from the dark above, thick as your wrist. Whatever it rings is very large.',
    choices: [
      {
        label: 'Pull it',
        hint: 'Most of the time, a Glimmer. Sometimes, the bell-ringers come.',
        outcome: [{ type: 'chance', p: 0.6, win: [{ type: 'glimmer' }], lose: [{ type: 'fight', encounter: 'x.acolytes' }], winText: 'One note, far above. Something bright drifts down with it.', loseText: 'One note, far above. Footsteps come running.' }],
        after: 'You pull.',
      },
      { label: 'Cut it down', hint: 'Gain a Bound Acolyte.', outcome: [{ type: 'card', card: 'bound.acolyte' }], after: 'The rope falls, and someone who was holding the other end falls with it. They are yours now.' },
      { label: 'Leave it', hint: 'Nothing happens.', outcome: [], after: 'Best not to wake whatever it rings.' },
    ],
  },
  {
    id: 'ev.stair',
    title: 'The Wrong Stair',
    text: 'There is a second stair beside the first, going up at an angle that makes your eyes water.',
    choices: [
      {
        label: 'Take the wrong stair',
        hint: 'Half the time, 50 Embers and 8 HP. Otherwise, a Door Husk.',
        outcome: [{ type: 'chance', p: 0.5, win: [{ type: 'embers', amount: 50 }, { type: 'hp', amount: 8 }], lose: [{ type: 'fight', encounter: 'x.husk' }], winText: 'It comes out somewhere quiet, with a cache left by a better-prepared climber.', loseText: 'It comes out in front of a door. The door turns around.' }],
        after: 'You go up sideways.',
      },
      { label: 'Stay on the right one', hint: 'Nothing happens.', outcome: [], after: 'The wrong stair watches you go.' },
    ],
  },
];
