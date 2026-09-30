/**
 * Everything the tutorial says. A lesson is one card of coaching pinned to a part of a screen. The coach
 * (coach.ts) shows each lesson once, the first time its situation comes up, and remembers that in the save.
 *
 * Basics come first: the first fight teaches Light, cards, holding and foe intents, and everything else
 * (weakness, Break, chains, rooms, shops, Kindling...) waits until the game shows it to the player.
 */

import { BROKEN_MULT, CHAIN_MAX_STEPS, CHAIN_STEP, FLOOR_HEAL, HAND_LIMIT, LATE_TURN, MAX_LIGHT, REST_HEAL, TASK_GLOAM, WEAK_MULT } from '@duskline/core';
import { PITY, SPARK, pct } from './rules';

export interface Lesson {
  id: string;
  title: string;
  body: string;
  /** A CSS selector for the part of the screen to light up. Every match is lit. Without one the card sits mid-screen. */
  target?: string;
  /** `modal` dims the screen and waits for Next. `nudge` outlines the part and shows its words in a strip the screen makes room for, so play is never blocked or covered. */
  mode: 'modal' | 'nudge';
  /** Which section of the How to play guide has the full rules. */
  more?: GuideSection;
}

export type GuideSection = 'goal' | 'around' | 'fight' | 'weakness' | 'chains' | 'statuses' | 'ultimate' | 'climb' | 'rooms' | 'cards' | 'kindling' | 'heroes' | 'saving';

const modal = (id: string, title: string, body: string, target?: string, more?: GuideSection): Lesson => ({ id, title, body, mode: 'modal', ...(target ? { target } : {}), ...(more ? { more } : {}) });
const nudge = (id: string, title: string, body: string, target?: string, more?: GuideSection): Lesson => ({ id, title, body, mode: 'nudge', ...(target ? { target } : {}), ...(more ? { more } : {}) });

export const LESSON_LIST: readonly Lesson[] = [
  // --- The first fight: the basics, in the order a turn goes ---------------------------------------------------
  modal('fight.light', 'Light', `The gold lamps are your Light. Every card costs Light to play, and you get ${MAX_LIGHT} fresh Light at the start of each turn.`, '.bt-lightrow', 'fight'),
  modal('fight.hand', 'Your hand', `Each turn you draw a hand of ${HAND_LIMIT} cards. On a card, the sword number is the damage it deals and the shield number is the ward it gives.`, '.bt-hand', 'fight'),
  modal('fight.hold', 'Play it or hold it', 'A card you do not play is not wasted. When you end the turn, each card still in your hand adds its ward to your guard against the foes. Every card is both an attack and a defence: you choose which to spend.', '.bt-hand', 'fight'),
  modal('fight.intent', 'What the foe will do', 'Foes show their next move before they act. The red number is the damage it is about to deal, and other words name its other tricks.', '.foe-plate .intent', 'fight'),
  modal('fight.forecast', 'The forecast', 'Above End turn the game compares the damage coming with the ward you would hold. "Safe" means nothing gets through. "Take 5" means five damage does.', '.bt-actions', 'fight'),
  nudge('fight.try', 'Your turn', 'Tap a card to pick it up, then tap it again to play it. When there are several foes, tap the one you want to hit.', '.bt-hand', 'fight'),
  nudge('fight.end', 'End the turn', 'When you have spent what you want, tap End turn. The cards still in your hand ward you while the Fades act.', '.bt-end', 'fight'),

  // --- Fights: met the first time they happen ----------------------------------------------------------------
  modal('fight.weak', 'A weakness', `Every foe is weak to some affinities, shown by the icons beside its Shell. Hitting a weakness deals ${pct(WEAK_MULT - 1)} more and chips the Shell. Empty the Shell for a Break.`, '.foe-plate .foe-row', 'weakness'),
  modal('fight.break', 'Break', `The Shell is empty. The foe loses its turn, takes ${pct(BROKEN_MULT - 1)} more damage, and your Light refills and you draw a card. It comes back hardened, so weak hits cannot chip its Shell until it acts again.`, '.foe-plate.broken', 'weakness'),
  modal('fight.chain', 'Chain', `Cards of the same affinity played one after another build a Chain. Each step adds ${pct(CHAIN_STEP)} damage, up to ${pct(CHAIN_STEP * CHAIN_MAX_STEPS)}. Linked cards keep any Chain going.`, '.bt-chain', 'chains'),
  modal('fight.ultimate', 'Your ultimate', 'The ring around your portrait is your gauge. It fills as you play, and faster on a Break. When it is full, your ultimate appears in your hand, free to play.', '.bt-portrait', 'ultimate'),
  modal('fight.status', 'Statuses', 'The small chips are statuses, and the number is how strong each is. Burn hurts every turn. Chill weakens attacks and Hex makes a unit take more; both fade a little each turn. Shock adds to the next hit, Rage hits harder, and Dim shrinks next turn\'s Light.', '.st-chips', 'statuses'),
  modal('fight.ash', 'Ash', 'Ash cannot be played and is thrown away at the end of the turn, but while it sits in your hand it crowds out a real card. Stop the foe that keeps making it.', '.bt-piles', 'cards'),
  modal('fight.shatter', 'Ward broken', 'Some moves, marked Break ward, strip the ward off the cards you were holding. Holding cards softens hits, but do not count on it against those.', '.bt-hero', 'fight'),
  modal('fight.late', 'The hour grows late', `From turn ${LATE_TURN} the Fades grow stronger every time they act. Stalling does not pay, so finish the fight.`, undefined, 'fight'),

  // --- The climb ---------------------------------------------------------------------------------------------
  modal('glimmer.first', 'A Glimmer', 'A Glimmer is a boon that lasts the whole climb. Each belongs to a Path, and taking one makes that Path turn up more often. Pick the one your hero lacks.', '.glimmers', 'climb'),
  modal('map.first', 'The floor ahead', 'You climb from the bottom. The glowing rooms are the ones you can reach: tap one to see what it holds, then tap Go. Paths only lead upward, so each choice closes the others.', '.map-node.open', 'climb'),
  modal('map.rooms', 'Read before you go', 'This panel names the room and what to expect. For a fight it also shows which affinities the foes are weak to, so you know which cards to bring.', '.map-detail', 'rooms'),
  modal('map.hud', 'HP, Embers and your deck', `Your HP carries from room to room, and each new floor heals you ${pct(FLOOR_HEAL)}. Embers are this climb's money and are gone when it ends. Deck shows your cards and Glimmers.`, '.climb-hud', 'climb'),
  modal('offer.first', 'Spoils', 'After a win, pick one card to add to your deck, or take none. Every card makes the deck bigger, so your best cards turn up less often. Skipping is a real choice.', '.offer-cards', 'cards'),
  modal('shop.first', 'The Ghost market', 'Spend Embers on cards, a Glimmer, healing, or having a card removed. A smaller deck finds its best cards sooner. Embers you do not spend are lost when the climb ends.', '.shop-services', 'rooms'),
  modal('rest.first', 'A place to rest', `Sleep heals ${pct(REST_HEAL)} of your HP. Or temper a card: it becomes stronger, marked with a +, for the rest of the climb.`, '.rest .btn-stack', 'rooms'),
  modal('event.first', 'Something on the stair', 'Every choice says what it costs before you pick. Some cost Embers, some cost HP. Take the one you can afford.', '.event-choices', 'rooms'),
  modal('mirror.first', 'The Mirror', 'The Mirror reads how you have been fighting and makes two Echoes: cards built from your habits. Take one now. When the climb ends you can keep an Echo for later climbs.', '.offer-cards.echoes', 'cards'),
  modal('results.first', 'The climb is over', 'Each floor you cleared earns Gloam and XP. Tap Collect to take them. Gloam is what you spend on Kindling. If you took an Echo at a Mirror, you can then keep one for future climbs.', '.results-head', 'kindling'),

  // --- Menus ------------------------------------------------------------------------------------------------
  modal('climbnew.first', 'Who climbs', 'Every Lamplighter brings their own deck and trait. Choose who climbs, then where: a new stratum opens when you clear the one below it.', '.hero-strip', 'heroes'),
  modal('home.first', 'Home', 'Climb the Gnomon starts a climb with your chosen Lamplighter. Climbing is how you earn Gloam, XP and new cards.', '.cta-climb', 'around'),
  modal('home.menu', 'The rest of the tower', 'Kindling spends Gloam to call new Lamplighters. Lamplighters lists your heroes, cards and Echoes. The daily climb is one shared map each day, and the Chronicle replays story scenes.', '.menu-grid', 'kindling'),
  modal('home.tasks', 'Daily tasks', `Three tasks a day, ${TASK_GLOAM} Gloam each. They refresh every day, and finishing them as you climb costs nothing extra.`, '.tasks', 'kindling'),
  modal('kindling.first', 'Kindling', `Kindling calls a new Lamplighter or card using Gloam, which you earn by playing. The bars show your pity and spark: pity guarantees a ★5 by pull ${PITY}, and spark lets you choose the featured ★5 at ${SPARK}.`, '.kx-actions', 'kindling'),
  modal('roster.first', 'Lamplighters', 'Your heroes, every card you have kindled, and the Echoes you have kept. Tap a Lamplighter to read their trait and starting deck.', '.roster-tabs', 'heroes'),
];

export const LESSONS: Readonly<Record<string, Lesson>> = Object.fromEntries(LESSON_LIST.map((l) => [l.id, l]));

/** The fight basics, in the order a turn goes. */
export const FIGHT_BASICS: readonly string[] = ['fight.light', 'fight.hand', 'fight.hold', 'fight.intent', 'fight.forecast', 'fight.try'];

export interface GuideEntry {
  id: GuideSection;
  title: string;
}

export const GUIDE_SECTIONS: readonly GuideEntry[] = [
  { id: 'goal', title: 'The goal' },
  { id: 'around', title: 'Getting around' },
  { id: 'fight', title: 'A fight, turn by turn' },
  { id: 'weakness', title: 'Weakness and Break' },
  { id: 'chains', title: 'Affinities and Chains' },
  { id: 'statuses', title: 'Statuses' },
  { id: 'ultimate', title: 'Ultimates and the late hour' },
  { id: 'climb', title: 'The climb' },
  { id: 'rooms', title: 'The rooms' },
  { id: 'cards', title: 'Cards and your deck' },
  { id: 'kindling', title: 'Gloam and Kindling' },
  { id: 'heroes', title: 'Lamplighters' },
  { id: 'saving', title: 'Saving and playing offline' },
];
