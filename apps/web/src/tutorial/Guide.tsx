import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import {
  AFFINITIES,
  ARCHIVE_SIZE,
  BROKEN_MULT,
  CHAIN_MAX_STEPS,
  CHAIN_STEP,
  CLEAR_GLOAM,
  DAILY_GLOAM,
  FLOOR_GLOAM,
  FLOOR_HEAL,
  HAND_LIMIT,
  LATE_TURN,
  MAX_LIGHT,
  STATUS_HELP,
  STATUS_NAME,
  TASK_GLOAM,
  WEAK_MULT,
  type NodeKind,
  type StatusId,
} from '@duskline/core';
import { HEROES, PULL_COST, requireCard } from '@duskline/content';
import { back } from '../game/nav';
import { sfx } from '../game/sfx';
import { toast } from '../game/store';
import { Glyph, KIND_HELP, KIND_NAME } from '../screens/climb/MapView';
import { CardFace } from '../ui/CardFace';
import { AFFINITY_LABEL, AffinityIcon, BladeIcon, EmberIcon, GloamIcon, LightPip, ShieldIcon, StatusIcon } from '../ui/Icons';
import { Sky } from '../ui/Sky';
import { helpOpen, startTutorial } from './coach';
import { GUIDE_SECTIONS, type GuideSection } from './lessons';
import { PITY, SPARK, pct } from './rules';

/**
 * How to play: every rule and every screen, for looking up at any time. The same pages show as a screen
 * (from the title, Home and Settings) and as a sheet over the game (from a lesson's Full rules, or the ?
 * in a fight), so a player never has to leave what they are doing to read them.
 */

function Steps({ items }: { items: ComponentChildren[] }): JSX.Element {
  return (
    <ol class="g-steps">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ol>
  );
}

function Fact({ icon, title, children }: { icon: ComponentChildren; title: string; children: ComponentChildren }): JSX.Element {
  return (
    <div class="g-fact">
      <span class="g-fact-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

const STATUS_IDS: StatusId[] = ['burn', 'chill', 'hex', 'shock', 'rage', 'dim'];
const ROOMS: NodeKind[] = ['battle', 'elite', 'event', 'shop', 'rest', 'mirror', 'guardian', 'boss'];

function Goal(): JSX.Element {
  return (
    <>
      <p>You are a Lamplighter, and the Gnomon is a tower that pins the sun at dusk. Climb it.</p>
      <ul class="g-list">
        <li>The Gnomon has three strata: the Root, the Hollow and the Crown, of three floors each. A climb is one stratum. Clear the Root to open the Hollow, then the Crown.</li>
        <li>A floor is a map of rooms with a guardian at the top. The last floor of a stratum ends in a boss.</li>
        <li>You fight with a deck of cards. Fights are turn-based: nothing moves until you act, so take as long as you like.</li>
        <li>A climb ends when its boss falls or your HP runs out. Either way, the floors you cleared pay Gloam and XP.</li>
        <li>Gloam buys Kindling, which calls new Lamplighters with new decks. Then you climb again, stronger.</li>
      </ul>
    </>
  );
}

function Around(): JSX.Element {
  return (
    <>
      <Fact icon={<b>1</b>} title="Title">
        Begin starts the story and your first climb. After that it says Continue, or Resume the climb. How to play and Settings are below it.
      </Fact>
      <Fact icon={<b>2</b>} title="Home">
        Climb the Gnomon starts or resumes a climb. Under it are the Daily climb, Kindling, Lamplighters and Chronicle cards, and your daily tasks. ⚙ is Settings and ? is this guide. Most of the cards open after your first climb.
      </Fact>
      <Fact icon={<b>3</b>} title="On a climb">
        The strip at the top shows your hero, HP, Embers and Deck. Tap Deck to see your cards and Glimmers. Every room is its own screen: a map, a fight, spoils, a market, a place to rest.
      </Fact>
      <Fact icon={<b>4</b>} title="In a fight">
        Top bar: Auto plays for you, 2× speeds things up, ? opens these rules, and ✕ gives up the climb. The foes are in the middle with their HP, Shell and weaknesses. Below them are your HP, Light and gauge, then your hand, then End turn.
      </Fact>
      <Fact icon={<b>5</b>} title="Going back">
        The ← button, or your phone's back gesture, goes back a screen. A climb you leave waits on Home as Resume the climb, and a fight you leave starts over from its first turn.
      </Fact>
      <Fact icon={<b>6</b>} title="Saving">
        Progress is saved on your device after every action, so closing the page loses nothing.
      </Fact>
    </>
  );
}

function Fight(): JSX.Element {
  return (
    <>
      <div class="g-strip" aria-hidden="true">
        <span class="g-strip-step">
          <span class="g-strip-art">
            {Array.from({ length: HAND_LIMIT }, (_, i) => (
              <i key={i} class="g-back" />
            ))}
          </span>
          Draw {HAND_LIMIT}
        </span>
        <span class="g-strip-step">
          <span class="g-strip-art">
            {Array.from({ length: MAX_LIGHT }, (_, i) => (
              <LightPip key={i} on />
            ))}
          </span>
          Spend Light
        </span>
        <span class="g-strip-step">
          <span class="g-strip-art">
            <BladeIcon size={18} />
            <span class="g-or">or</span>
            <ShieldIcon size={18} />
          </span>
          Play or hold
        </span>
        <span class="g-strip-step">
          <span class="g-strip-art">
            <b class="g-end">End</b>
          </span>
          Foes act
        </span>
      </div>
      <Steps
        items={[
          <>
            Each turn you get <b>{MAX_LIGHT} Light</b> (the gold lamps) and a fresh <b>hand of {HAND_LIMIT} cards</b>.
          </>,
          <>
            <b>Play</b> a card by tapping it, then tapping it again. With several foes, tap the one you want to hit. A card costs Light.
          </>,
          <>
            <b>Hold</b> what you do not play. When you end the turn, each card still in your hand adds its ward (the shield number) to your guard, then goes to the discard pile. Every card is both an attack and a defence.
          </>,
          <>
            <b>Read the foes.</b> Each shows its next move above its name before it acts. Above End turn, the forecast compares the damage coming with the ward you would hold.
          </>,
          <>
            <b>End turn.</b> The foes act. You win when every foe is down, and lose if your HP reaches 0. HP carries from room to room.
          </>,
        ]}
      />
      <div class="g-card-demo">
        <CardFace def={requireCard('cut')} size="list" />
        <ul class="g-list g-tight">
          <li>
            <LightPip on /> The gold seal is the cost in Light.
          </li>
          <li>
            <BladeIcon size={14} /> The sword number is the damage when you play it.
          </li>
          <li>
            <ShieldIcon size={14} /> The shield number is the ward when you hold it.
          </li>
          <li>
            <em>Steadfast</em> cards stay in your hand after warding. <em>Fleeting</em> ones vanish if you do not play them. <em>Ash</em> cannot be played at all.
          </li>
        </ul>
      </div>
      <p class="muted small">Auto plays with the same policy the balance simulator uses, and 2× speeds fights up. On a computer, 1 to 3 pick a card, E ends the turn, and Esc puts a card back.</p>
    </>
  );
}

function Weakness(): JSX.Element {
  return (
    <>
      <div class="g-foe" aria-hidden="true">
        <span class="g-foe-name">Unturning Acolyte</span>
        <span class="foe-row">
          <span class="foe-shell">
            <i class="on" />
            <i class="on" />
            <i class="on" />
          </span>
          <span class="foe-weak">
            <AffinityIcon a="flame" size={15} />
            <AffinityIcon a="gale" size={15} />
          </span>
        </span>
      </div>
      <ul class="g-list">
        <li>
          Under each foe's name are its <b>Shell</b> (the diamonds) and its <b>weaknesses</b> (the icons).
        </li>
        <li>
          Hitting a weakness deals <b>{pct(WEAK_MULT - 1)} more</b> and chips one diamond of Shell. Hitting something it <b>resists</b> deals half.
        </li>
        <li>
          Empty the Shell and the foe is <b>Broken</b>: its move is cancelled, it loses its turn, and it takes <b>{pct(BROKEN_MULT - 1)} more</b> damage. Your Light refills and you draw a card.
        </li>
        <li>A Broken foe comes back <b>hardened</b>: its Shell is full again but weak hits cannot chip it until it acts.</li>
        <li>Before you enter a fight room, the map shows what its foes are weak to, so you can bring the right cards.</li>
      </ul>
    </>
  );
}

function Chains(): JSX.Element {
  return (
    <>
      <div class="g-aff" aria-hidden="true">
        {AFFINITIES.map((a) => (
          <span key={a} class="g-aff-one">
            <AffinityIcon a={a} size={22} />
            {AFFINITY_LABEL[a]}
          </span>
        ))}
      </div>
      <ul class="g-list">
        <li>Most cards carry an <b>affinity</b>, shown by the small icon beside the name. Foes are weak to some and resist others.</li>
        <li>
          Play cards of the <b>same affinity in a row</b> to build a Chain. Each step adds <b>{pct(CHAIN_STEP)}</b> damage, up to <b>{pct(CHAIN_STEP * CHAIN_MAX_STEPS)}</b> once {CHAIN_MAX_STEPS + 1} in a row match.
        </li>
        <li>A card of another affinity breaks the Chain, unless it is <b>Linked</b>: Linked cards carry any Chain.</li>
        <li>The Chain counter appears over the field while one is running.</li>
      </ul>
    </>
  );
}

function Statuses(): JSX.Element {
  return (
    <>
      <p>Statuses sit on a unit as small chips with a number. Both you and the foes can have them.</p>
      <div class="g-statuses">
        {STATUS_IDS.map((s) => (
          <div key={s} class="g-status">
            <span class={`st-chip st-${s}`}>
              <StatusIcon s={s} size={12} />3
            </span>
            <div>
              <strong>{STATUS_NAME[s]}</strong>
              <p>{STATUS_HELP[s]}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Ultimate(): JSX.Element {
  return (
    <>
      <div class="g-gauge" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" />
          <circle cx="20" cy="20" r="18" class="fill" style={{ strokeDasharray: '70 113' }} />
        </svg>
        <span>Your gauge</span>
      </div>
      <ul class="g-list">
        <li>The ring around your portrait is your <b>gauge</b>. It fills a little with every card you play, and a lot on a Break.</li>
        <li>When it is full, your hero's <b>ultimate</b> appears in your hand, free to play, even past the hand limit. It is set aside once played.</li>
        <li>
          <b>The hour grows late.</b> From turn {LATE_TURN} the Fades gain Rage every time they act, and a boss gains more. Stalling does not pay.
        </li>
      </ul>
    </>
  );
}

function Climb(): JSX.Element {
  return (
    <>
      <ul class="g-list">
        <li>
          A <b>floor</b> is a map of four rows of rooms and a guardian at the top. You choose your path: paths only lead upward.
        </li>
        <li>
          <b>HP carries over</b> between rooms, and each new floor heals you {pct(FLOOR_HEAL)}. If it reaches 0, the climb ends.
        </li>
        <li>
          <EmberIcon /> <b>Embers</b> are the climb's own money. They come from fights and are gone when it ends.
        </li>
        <li>
          <b>Glimmers</b> are boons that last the whole climb: one at the start, and more after elites, guardians and bosses.
        </li>
        <li>
          The <b>daily climb</b> gives everyone the same map each day, and pays {DAILY_GLOAM} Gloam the first time you clear it. Your first climb always uses the same hand-checked map.
        </li>
      </ul>
    </>
  );
}

function Rooms(): JSX.Element {
  return (
    <div class="g-rooms">
      {ROOMS.map((k) => (
        <div key={k} class="g-room">
          <svg viewBox="0 0 24 24" class={`g-glyph k-${k}`} aria-hidden="true">
            <Glyph kind={k} />
          </svg>
          <div>
            <strong>{KIND_NAME[k]}</strong>
            <p>{KIND_HELP[k]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Cards(): JSX.Element {
  return (
    <>
      <ul class="g-list">
        <li>
          After a win you pick <b>one of three cards</b> to add to your deck, or take none. Every card makes the deck bigger, so your best cards turn up less often: skipping is a real choice.
        </li>
        <li>
          Rewards come from the common pool, your hero's own signature cards, cards you have kindled, Echoes you have kept, and <b>bound Fades</b>: cards made from the foes you beat.
        </li>
        <li>
          <b>Tempering</b> a card (at a rest) makes it stronger for the rest of the climb, and it shows a +. Ghost markets sell cards, Glimmers and healing, and will take a card out of your deck for good.
        </li>
        <li>
          A <b>Mirror</b> reads how you fight and offers two <b>Echoes</b>: cards made from your habits. When a climb ends you can keep one Echo, up to {ARCHIVE_SIZE} in all, and kept Echoes turn up as rewards in later climbs for any hero.
        </li>
      </ul>
    </>
  );
}

function Kindling(): JSX.Element {
  return (
    <>
      <ul class="g-list">
        <li>
          <GloamIcon /> <b>Gloam</b> is earned by playing: {FLOOR_GLOAM} for every floor you clear, {CLEAR_GLOAM} for clearing the climb, {DAILY_GLOAM} for your first daily clear each day, {TASK_GLOAM} for each daily task, and for ranking up. What climbing pays has a weekly limit, so there is never a reason to grind.
        </li>
        <li>
          <b>Kindling</b> spends Gloam to call a Lamplighter or a card. One pull costs {PULL_COST.single} Gloam, ten cost {PULL_COST.ten.toLocaleString('en-US')}.
        </li>
        <li>
          <b>Pity</b> guarantees a ★5 by pull {PITY} since your last one, and <b>spark</b> lets you choose the featured ★5 at {SPARK} pulls. Odds and pity shows the exact chances.
        </li>
        <li>Repeat pulls are not wasted: a duplicate hero raises their resonance, and a duplicate card is offered already tempered at 3 copies.</li>
      </ul>
    </>
  );
}

function Heroes(): JSX.Element {
  return (
    <ul class="g-list">
      <li>
        There are {HEROES.length} Lamplighters. Some join through the story, the rest come from Kindling. Each brings a <b>trait</b>, a <b>starting deck</b> of 3 Lamp Cuts, 3 Braces and two copies of their signature card, and an <b>ultimate</b>.
      </li>
      <li>Choose who climbs on the Climb screen. The Lamplighters screen lists everyone you have, their cards and your kept Echoes.</li>
      <li>
        <b>Resonance</b> grows when you kindle a hero again. At 3 their own starting cards come tempered, and at 5 their ultimate does too.
      </li>
    </ul>
  );
}

function Saving(): JSX.Element {
  return (
    <ul class="g-list">
      <li>Your progress is saved on your device, in this browser or installed app. There is no account, and nothing is uploaded.</li>
      <li>Settings has <b>Copy save</b> and <b>Paste a save</b> to move progress between browsers, the installed app and the offline file.</li>
      <li>Once the game has loaded it needs no connection. Settings, under Play offline, shows whether this device has everything, and offers to install the game or download one file that works anywhere.</li>
    </ul>
  );
}

const BODIES: Record<GuideSection, () => JSX.Element> = {
  goal: Goal,
  around: Around,
  fight: Fight,
  weakness: Weakness,
  chains: Chains,
  statuses: Statuses,
  ultimate: Ultimate,
  climb: Climb,
  rooms: Rooms,
  cards: Cards,
  kindling: Kindling,
  heroes: Heroes,
  saving: Saving,
};

/** Every section as an accordion, with one open. */
export function GuideBody({ open: start, onReplay }: { open: GuideSection; onReplay?: () => void }): JSX.Element {
  const [open, setOpen] = useState<GuideSection | null>(start);
  const refs = useRef<Partial<Record<GuideSection, HTMLElement | null>>>({});
  useEffect(() => setOpen(start), [start]);
  useEffect(() => {
    if (open) refs.current[open]?.scrollIntoView({ block: 'start' });
    // Only when the requested section changes, not on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);
  return (
    <div class="guide-body">
      {GUIDE_SECTIONS.map((g) => {
        const Body = BODIES[g.id];
        const on = open === g.id;
        return (
          <section key={g.id} class={`g-sec panel${on ? ' on' : ''}`} ref={(el) => {
              refs.current[g.id] = el;
            }}
          >
            <h2>
              <button
                class="g-head"
                aria-expanded={on}
                onClick={() => {
                  sfx.tap();
                  setOpen(on ? null : g.id);
                  // The section above it folds away, so bring the one just opened back to the top.
                  if (!on) requestAnimationFrame(() => refs.current[g.id]?.scrollIntoView({ block: 'start' }));
                }}
              >
                <span class="display">{g.title}</span>
                <span class="g-caret" aria-hidden="true">
                  {on ? '−' : '+'}
                </span>
              </button>
            </h2>
            {on && (
              <div class="g-content">
                <Body />
              </div>
            )}
          </section>
        );
      })}
      <div class="g-foot">
        <p class="muted small">Want the coaching again? It walks through your first fight and each new part of the game as you meet it.</p>
        <button
          class="btn btn-block"
          onClick={() => {
            startTutorial(true);
            toast('The tutorial will play again as you go.', 'good');
            onReplay?.();
          }}
        >
          Replay the tutorial
        </button>
      </div>
    </div>
  );
}

/** How to play as a screen. */
export function Guide({ section }: { section?: GuideSection }): JSX.Element {
  return (
    <div class="screen guide">
      <Sky variant="night" />
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={back} aria-label="Back">
          ←
        </button>
        <h1>How to play</h1>
      </header>
      <div class="body scroll">
        <GuideBody open={section ?? 'goal'} onReplay={back} />
      </div>
    </div>
  );
}

/** How to play as a sheet over whatever the player is doing, opened from a lesson or the ? in a fight. */
export function HelpHost(): JSX.Element | null {
  const section = helpOpen.value;
  if (!section) return null;
  const close = (): void => {
    helpOpen.value = null;
  };
  return (
    <div class="overlay help-overlay" role="dialog" aria-modal="true" aria-label="How to play" onClick={close}>
      <div class="sheet help-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="row help-head">
          <h2 class="display grow">How to play</h2>
          <button class="btn btn-small btn-ghost" onClick={close}>
            Close
          </button>
        </div>
        <div class="help-scroll scroll">
          <GuideBody open={section} onReplay={close} />
        </div>
      </div>
    </div>
  );
}
