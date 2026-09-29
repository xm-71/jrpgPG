import type { BeatDef } from '@duskline/core';

/**
 * The story, told between climbs. Scenes come due as the player reaches floors and clears strata;
 * each is seen once, may pay a little Gloam, and may bring a hero into the crew.
 */
export const BEATS: readonly BeatDef[] = [
  {
    id: 'prologue',
    chapter: 0,
    title: 'The Gnomon Opens',
    trigger: { type: 'start' },
    sky: 'night',
    lines: [
      { who: 'narrator', text: 'A thousand years ago, the world of Hesper stopped turning.' },
      { who: 'narrator', text: 'One half burns under a noon that never ends. The other freezes in a night with no morning.' },
      { who: 'narrator', text: 'Between them runs the Duskline, a ring of endless sunset, where cities on colossal legs keep walking to stay in the light.' },
      { who: 'narrator', text: 'At the heart of the Duskline stands the Gnomon: a black tower tall enough to pin the sun. Its shadow has not moved in a thousand years.' },
      { who: 'narrator', text: 'Tonight its doors opened, and the Fades came pouring out.' },
      { who: 'marisol', text: 'Wren. The Fades are on the rail, and they are coming from the tower.' },
      { who: 'wren', text: 'Then that is where I am going. Hold Vesper. I will hold the light.' },
    ],
  },
  {
    id: 'answering-lamp',
    chapter: 0,
    title: 'The Answering Lamp',
    trigger: { type: 'firstClimbEnd' },
    gloam: 60,
    lines: [
      { who: 'marisol', text: 'You went into the Gnomon alone, with a lamp and a pocket of paper.' },
      { who: 'wren', text: 'The Fades came apart when I pinned them to the paper. Like they had been waiting for someone to.' },
      { who: 'marisol', text: 'Everything in that tower is waiting. That is what frightens me.' },
      { who: 'narrator', text: 'In the lantern-room, the Gloamstone Wren carries has started to glow on its own. It wants to be lit.' },
    ],
  },
  {
    id: 'first-afterlight',
    chapter: 0,
    title: 'The First Afterlight',
    trigger: { type: 'firstClimbEnd' },
    lines: [
      { who: 'io', text: 'Ah. The sun is stuck. That would explain the headache.' },
      { who: 'marisol', text: 'Who in the Hush are you?' },
      { who: 'io', text: 'Io. I think I used to be very old, or very early. Either way, hello.' },
      { who: 'wren', text: 'You came out of the stone. Out of the light.' },
      { who: 'io', text: 'I came out of a sunrise. You would not believe me if I described it. Point me at the tower.' },
    ],
  },
  {
    id: 'salvage',
    chapter: 1,
    title: 'Salvage on the Stair',
    trigger: { type: 'reachFloor', stratum: 0, floor: 1 },
    unlocks: ['pip'],
    lines: [
      { who: 'pip', text: 'Oh! Don’t step there. That stair is mine. I mean, I found it first.' },
      { who: 'wren', text: 'You are picking lamp-glass off the steps. Inside the Gnomon.' },
      { who: 'pip', text: 'Best glass on the Duskline. The Fades don’t want it and the Unturning don’t notice kids.' },
      { who: 'pip', text: 'You’re going up? I’m coming. Somebody has to fix you when you break.' },
    ],
  },
  {
    id: 'warden-falls',
    chapter: 1,
    title: 'The Warden Falls',
    trigger: { type: 'clearStratum', stratum: 0 },
    gloam: 250,
    unlocks: ['tamsin'],
    lines: [
      { who: 'narrator', text: 'The Warden’s page falls from its halo and burns before it touches the floor. On it, a list of names, and the last one is still wet.' },
      { who: 'tamsin', text: 'Those are people from the night side. My people. The Unturning writes them down, and they stop.' },
      { who: 'wren', text: 'Stop what?' },
      { who: 'tamsin', text: 'Everything. Breathing. Ageing. Hoping. They call it mercy. I call it a jar.' },
      { who: 'tamsin', text: 'The Hollow is above us. I have been trying to get in for a year. You got further in a night.' },
    ],
  },
  {
    id: 'hollow-knight',
    chapter: 2,
    title: 'A Knight in the Hollow',
    trigger: { type: 'reachFloor', stratum: 1, floor: 1 },
    unlocks: ['aurelian'],
    lines: [
      { who: 'aurelian', text: 'Stop there, Lamplighter. The Meridian Dominion forbids anyone to climb.' },
      { who: 'io', text: 'He has read the hymnal. Look at his hands.' },
      { who: 'aurelian', text: 'I was sent to protect the Stillness. I read what they sing up here. It is not protection.' },
      { who: 'aurelian', text: 'I will climb with you, if you will have a knight who has only just learned what he was guarding.' },
    ],
  },
  {
    id: 'bell-stops',
    chapter: 2,
    title: 'The Bell Stops',
    trigger: { type: 'clearStratum', stratum: 1 },
    gloam: 250,
    sky: 'night',
    lines: [
      { who: 'narrator', text: 'The Tolling Bell cracks from lip to crown. For one breath, every Fade in the tower goes quiet.' },
      { who: 'io', text: 'Did you feel that? The shadow on the floor moved. Only a little.' },
      { who: 'marisol', text: 'The Strider’s compass swung for the first time in my life. Then it went still again.' },
      { who: 'io', text: 'That is how it starts. That is how I remember it starting.' },
    ],
  },
  {
    id: 'the-hour',
    chapter: 3,
    title: 'Who Keeps the Hour',
    trigger: { type: 'reachFloor', stratum: 2, floor: 1 },
    gloam: 100,
    sky: 'night',
    lines: [
      { who: 'narrator', text: 'A voice comes down the stair, calm and very tired.' },
      { who: 'narrator', text: '“Nothing up here has died in a thousand years, Lamplighter. Nothing has been born, either. It is a fair trade. Go home.”' },
      { who: 'wren', text: 'It sounds so sure.' },
      { who: 'tamsin', text: 'Jars are always sure.' },
    ],
  },
  {
    id: 'the-shadow-moves',
    chapter: 3,
    title: 'The Shadow Moves',
    trigger: { type: 'clearStratum', stratum: 2 },
    gloam: 400,
    lines: [
      { who: 'narrator', text: 'The Hour-Keeper lets go. For the first time in a thousand years, the Gnomon’s shadow moves one degree across the Duskline.' },
      { who: 'io', text: 'There. Did you see it? That was a minute. A real one.' },
      { who: 'wren', text: 'It is still stuck. It moved, and then it stopped again.' },
      { who: 'io', text: 'Then we keep climbing. There are other towers. There is always another hour.' },
      { who: 'narrator', text: 'To be continued.' },
    ],
  },
];
