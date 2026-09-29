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

## Play offline

Duskline needs no connection once it has loaded, and there are two ways to keep it.

- **Install it.** On the website, Chrome, Edge and Android browsers offer **Install Duskline** on the title screen and in Settings; on an iPhone or iPad, use Add to Home Screen (steps below). The installed app opens from your home screen or app list, full screen, with or without a connection.
- **Download it.** Settings, then Play offline, then **Download offline copy** saves one file, `duskline-offline.html`, with the whole game inside it. Open it in any browser, no install and no server. This is also how to keep the game from the claude.ai page, which cannot install itself.

The first visit saves every file on the device (Settings shows *Ready* when it has). A new version downloads quietly in the background and is offered in Settings as **Restart to update**, so an update never swaps files under a fight in progress.

Progress is stored per place: in the installed app, in each browser, and in the offline file. To move it between them, use **Copy save** and **Paste a save** in Settings.

### On an iPhone or iPad

iOS has no install prompt a page can trigger, so the title screen shows **Add to Home Screen** in Safari (and Chrome or Edge on iOS 16.4 and later), which opens the steps; Settings carries them too.

1. Tap the Share button in the browser's toolbar.
2. Choose **Add to Home Screen**. If iOS asks whether to open it as a web app, leave that on.
3. Tap **Add**, then open Duskline from the Home Screen once while online. The app saves its own copy of the game there, and works with no connection from then on.

Things worth knowing:

- **The app's save is separate from Safari's.** iOS gives a Home Screen app its own storage. To bring progress across, tap **Copy save** in Safari, then **Paste a save** in the app; the app's first launch says so.
- **The app is the safer place to play offline.** Safari can clear a site's saved files after a week without a visit. Home Screen apps are exempt.
- **Icon and launch screen.** The build draws the Home Screen icon at 180, 167, 152 and 120 px and a launch image for every iPhone and iPad screen size (portrait for phones, both ways for tablets). iOS shows a blank screen unless one matches the device exactly, and ignores the manifest's `background_color`, so a new model needs one line in `SCREENS` in `apps/web/offline/ios.ts`. iOS takes the launch image when the app is added to the Home Screen, so a changed one usually shows only after the app is removed and added again.
- **It plays like an app.** In the installed app, text selection, the long-press menu and pinch zoom are off; content runs under the status bar and clears the home indicator with the safe-area insets; the paste box is 16 px so iOS does not zoom the page. iOS ignores the manifest's `orientation`, so a phone held sideways is covered with a note to turn it upright (there is not room for a fight).

The end-to-end suite checks all of this in an iPhone-shaped Chromium with real safe-area insets, because CI has no WebKit. It has not been run on a physical iPhone, so give it a pass on one before a release.

### How it works

`apps/web/offline/plugin.ts` runs after the production build. It renders the app icons from one SVG (`icon.ts`) and the iOS launch images (`splash.ts`, sizes in `ios.ts`), writes the web manifest, and writes `sw.js` from the template in `sw.js`: a service worker with a hash of every cached file as its version, so every build gets a fresh cache and old ones are deleted. Every page load is answered with the cached shell and every saved file from the cache (the launch images are not saved, since iOS reads only one of them). `src/game/offline.ts` registers the worker and tracks its state for Settings, and `src/game/offlineCopy.ts` saves the copy. `pnpm build:site` builds the site, builds the single-file version and puts it beside the site as `duskline-offline.html`.

## Hosting it

The site is static, so any static host works. `vercel.json` is set up for Vercel: it runs `pnpm build:site`, serves `apps/web/dist`, keeps `sw.js` and the manifest revalidating so updates arrive, and caches the hashed files in `assets/` for a year. Paths are relative, so it also works under a sub-path. Service workers need https (localhost is exempt).

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
  offline/          The build step that makes it installable and offline: icons, iOS launch images, manifest, service worker.
tools/sim         Headless simulator used to balance the game.
tools/e2e         Browser smoke test: a new player's first climb, first Kindling, a reload, play with no connection, and the iPhone Home Screen pieces.
docs/roadmap.html The original research and roadmap.
```

## Development

```sh
pnpm typecheck    # TypeScript, strict
pnpm test         # Vitest across packages
pnpm build        # production build to apps/web/dist
pnpm build:site   # that, plus the single-file build copied in as dist/duskline-offline.html (what Vercel runs)
pnpm check        # all three
pnpm e2e          # after a build: plays the first climb in headless Chromium, again with the network cut, then checks the iPhone app pieces
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
- **Each hero is drawn in a different manga tradition.** Wren is a shonen lead, Io a shonen rival, Marisol a sukeban, Tamsin a kunoichi, Aurelian a bishonen, Pip a chibi, Ysolde seinen, Kestrel Showa classic, Sable classic shoujo, Brannoch gekiga, Nim a majokko and Ondrej a yokai-manga figure. A hero's `Look` names the tradition, and `apps/web/src/art/manga` turns it into proportions (2.6 to 8.4 heads tall), eyes, hair, costume, ink weight and the way shadows are filled in (screentone, hatching, stipple or solid black). The Fades are drawn as horror-manga ink.
- **Five expressions.** Every hero has a calm, fierce, hurt, glad and shocked face, drawn with manga symbols (the popping vein, sweat drops, gloom lines, blush, sparkles). Story lines carry a mood, and the fight portrait reacts to hits, Breaks and heals. Story scenes are laid out as manga pages with speech balloons, and ultimates play as a cut-in panel.

### Legal

No license has been chosen yet, so the code is all rights reserved for now. The setting, names and characters are original. The fights and the climb take after tower-climbing deckbuilders such as Kazuma Kaneko's Tsukuyomi (hold-to-ward hands, Breaks that give you your turn back, cards made from how you play); Duskline uses none of that game's names, characters or art.
