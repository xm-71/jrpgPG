# Duskline

A tower-climbing card game for the browser and phones, in ink and ember. The sun is stuck on the horizon, a black tower called the Gnomon pins it there, and a crew of Lamplighters climbs it with a hand of three cards.

**No real money, ever.** The gacha, called Kindling, is paid for with **Gloam**, a currency you only earn by playing. There is nothing to buy.

- How to play: [Fights](#fights) and [The climb](#the-climb) below.
- The original research and roadmap: open [`docs/roadmap.html`](docs/roadmap.html) in a browser.

## Play it

```sh
pnpm install
pnpm dev          # http://localhost:5173
```

Requires Node 22.12 or newer and pnpm 10. Everything runs in the browser; progress is saved to `localStorage`.

Useful URL parameters while testing: `?now=2026-10-05T10:00:00Z` moves the game clock (daily tasks, the daily climb, banner rotation) and `?cycle=2` pins the rate-up banner.

## Fights

Each turn you get **4 Light** (the gold lamps) and a fresh **hand of 3 cards**.

- **Play or hold.** Playing a card costs Light. Every card you don't play is *held*: when you end the turn it adds its ward (the shield number) to your guard for the foes' turn, then goes to the discard pile. So every card is both an attack and a defence, and the choice is which to spend. *Steadfast* cards stay in hand, *Fleeting* cards vanish if you don't play them, and *Ash* can't be played at all.
- **Intents.** Foes show what they will do before you act. Above End turn, a forecast compares the damage coming with the ward you would hold.
- **Weakness and Break.** Hitting a weakness deals ×1.25 and chips the foe's **Shell**. At zero Shell the foe is **Broken**: its intent is cancelled, it loses its turn, it takes ×1.5 damage, and your Light refills and you draw a card. A Broken foe comes back *Hardened* until it acts again.
- **Chains.** Cards of the same affinity in a row add +20% damage each, up to +60%. *Linked* cards carry any chain.
- **Statuses.** Burn (damage each turn), Chill (deals less), Hex (takes more), Shock (adds to the next hit), Rage (hits harder), Dim (less Light next turn).
- **Ultimates.** A gauge fills as you play (and faster on Breaks). When it is full, your hero's ultimate appears in your hand, free.
- **The late hour.** From turn 12 the Fades grow stronger every time they act, so stalling doesn't pay.

Auto-battle and 2× speed are always available; auto uses the same policy the simulator plays with.

## The climb

The Gnomon has three strata, **the Root**, **the Hollow** and **the Crown**, of three floors each. A floor is a map of four rows of rooms and a guardian at the top; the last floor ends in the stratum's boss. You choose your path up.

| Room | What happens |
| --- | --- |
| Fades | A fight. Win Embers and a choice of three cards. |
| Elite | A harder fight for better cards and a Glimmer. The Root keeps elites off its first floor. |
| Unknown | An event. Every choice says what it costs. |
| Ghost market | Spend Embers on cards, a Glimmer, healing, or removing a card. |
| Rest | Heal 30%, or temper (upgrade) a card. |
| Mirror | The tower offers an **Echo**, a card made from how you have been fighting. |

HP carries over between rooms, and each new floor heals 20%. **Embers** are the climb's own money and are gone when it ends. **Glimmers** are boons that last the whole climb: one at the start, and more after elites, guardians and bosses.

Card rewards draw from the common pool, your hero's signature cards, the cards you have kindled, the Echoes you have kept, and **bound Fades**: cards made from the foes you beat.

A **daily climb** gives everyone the same map each day. A new player's first climb always uses the same hand-checked map.

### Echoes

A Mirror reads your climb so far: whether you Break, Chain, hold, survive or strike first, which affinity you favour, and how much you hold back. It makes two cards from that, and you take one. The same climb always makes the same Echoes. When a climb ends you can keep one Echo, up to 12 in all, and kept Echoes turn up as rewards in later climbs for any hero.

## Heroes and Kindling

There are twelve heroes. Some join through the story and the rest come from Kindling. Each brings their own deck:

- a **trait** (for example, Wren heals on each Break and after each win),
- a **starting deck** of 3 Lamp Cuts, 3 Braces and 2 copies of their signature card,
- two **signature cards** that only they find as rewards,
- an **ultimate**.

**Kindling** pulls heroes and cards. A pulled card joins the reward pool of every climb, and at 3 copies it is offered already tempered. A duplicate hero adds **Resonance**: +5% max HP a step, tempered starting cards at Resonance 3 and a tempered ultimate at 5.

The rules: ★5 base rate 2%, soft pity from pull 45, a guaranteed ★5 by pull 60, a 60/40 featured split with a guarantee after a miss, and a **Spark** at 120 pulls to choose the featured ★5. Unused Spark turns back into Gloam when a banner ends. The **Odds** page shows the exact rules and a probability chart computed by the same code the game runs.

### Where Gloam comes from

Story scenes (60 to 400, once each), rank-ups (50), daily tasks (three a day, 25 each), climbing (40 a floor and 60 for reaching the top, capped at 300 a week), the daily climb (120 once a day) and a weekly milestone (300 for three daily clears). A test asserts that a regular player can afford about 20 pulls a week.

## Balance

`pnpm sim climb` plays 100 climbs per hero per stratum from a fresh starting deck at Rank 1. Currently the Root is cleared 82% of the time, the Hollow 45% and the Crown 28%. An average fight takes three to five turns in the Root, and longer higher up. `packages/content/src/balance.test.ts` fails if a stratum drifts out of its target band.

## Repository layout

```
packages/core     Rules and data types. No DOM, no randomness except a seeded RNG.
  cards/            The card fight engine, statuses, rules text, Echo generation, an auto-play policy.
  climb/            Floor maps, the climb itself (fights, rewards, shops, rests, events, Mirrors), an auto-climber.
  kindling/         Pull rules, pity, spark, duplicates, exact odds analysis.
  profile.ts        The player's whole save, its migration from version 1, and every way to change it.
packages/content  Heroes and their decks, cards, Fades, strata, events, Glimmers, story scenes and banners, with schema validation.
apps/web          Vite + Preact + PixiJS client.
tools/sim         Headless simulator used to balance the game.
tools/e2e         Browser smoke test: a new player's first climb, first Kindling and a reload.
docs/roadmap.html The original research and roadmap.
```

## Development

```sh
pnpm typecheck    # TypeScript, strict
pnpm test         # Vitest across packages
pnpm build        # production build to apps/web/dist
pnpm check        # all three
pnpm e2e          # after a build: plays the first climb in headless Chromium
pnpm sim all      # balance report: climbs, single fights, Kindling
pnpm sim climb --stratum 1 --hero io --n 200
```

### Design notes

- **Deterministic.** All randomness is a seeded generator whose state is plain JSON. A fight, a climb or a Kindling session replays exactly from its seed and inputs, which makes bugs reproducible and balance testable.
- **The client only draws.** Rules live in `packages/core`. The screen plays the engine's events back as animation and then re-syncs from the engine's state.
- **Balance is measured, not guessed.** `tools/sim` climbs with the same heuristic that powers auto-battle.
- **Fair odds.** The gacha rules are data (`BannerRules`). The Odds page, the pull code and the tests all read the same definition; the tests run a million simulated pulls and compare them with an exact dynamic-programming analysis.
- **Saves carry forward.** Saves from the earlier version (with the Descent and party battles) migrate on load: your heroes, cards, Gloam, pity and pull history are kept.
- **Art is generated.** Heroes, Fades, card art and sigils are procedural SVG drawn from small records, so the repository has no binary art and everything can be restyled in code. Fonts are Shippori Mincho B1, Chakra Petch and Zen Kaku Gothic New via `@fontsource`.

### Legal

No license has been chosen yet, so the code is all rights reserved for now. The setting, names and characters are original. The fights and the climb take after tower-climbing deckbuilders such as Kazuma Kaneko's Tsukuyomi (hold-to-ward hands, Breaks that give you your turn back, cards made from how you play); Duskline uses none of that game's names, characters or art.
