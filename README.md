# Duskline

An original anime JRPG for the browser and phones. A sun stuck on the horizon, cities that walk to stay in the light, and a crew of Lamplighters holding back the Fades.

**No real money, ever.** The gacha, called Kindling, is paid for with **Gloam**, a currency you only earn by playing. There is nothing to buy.

- Roadmap and design: open [`docs/roadmap.html`](docs/roadmap.html) in a browser.
- Rules of the world: see [Design notes](#design-notes) below.

## Play it

```sh
pnpm install
pnpm dev          # http://localhost:5173
```

Requires Node 22.12 or newer and pnpm 10. Everything runs in the browser; progress is saved to `localStorage`.

Useful URL parameters while testing: `?now=2026-10-05T10:00:00Z` moves the game clock (daily tasks, the daily Descent, banner rotation) and `?cycle=2` pins the rate-up banner.

## What is in it

| Mode | What it is |
| --- | --- |
| **Story** | Seven stages across a prologue and chapter one, with dialogue, a scripted first Kindling and heroes who join as you go. |
| **Battles** | Speed-timeline turns. Hit a weakness to chip Shell; empty Shell is a **Break** (bonus damage, lost turn). Weakness hits earn an **Encore**, allies can take the **baton** for bonus damage, and when every foe is Broken you can call a **Horizon Burst**. A shared **Lantern** pool pays for skills; ultimates fire as interrupts. |
| **Kindling** | The gacha. ★5 base 2%, soft pity from pull 45, hard pity at 60, a 60/40 featured split with a guarantee after a miss, and a **Spark** at 120 pulls to choose the featured ★5. Unused Spark turns back into Gloam when a banner ends. The **Odds** page shows the exact rules and a probability chart computed by the same code the game runs. |
| **Descent** | A three-floor roguelite. HP carries over, you pick Glimmers (boons) after each fight, and there is a daily seed everyone shares. |
| **Roster** | Party, hero sheets, Resonance (duplicates), Memory Cards. |
| **Daily tasks** | Three small goals a day, 25 Gloam each. |

### Where Gloam comes from

Story first clears (60 to 250), rank-ups (50), daily tasks (25 each, capped 75 a day), Descent floors (40), Descent clears (60), the daily Descent (120 once a day) and a weekly milestone (300 for three daily clears). Descent pay is capped each week. A test asserts that a regular player can afford about 20 pulls a week.

## Repository layout

```
packages/core     Rules and data types. No DOM, no randomness except a seeded RNG.
  battle/           The turn engine, damage, timeline, an auto-play policy, invariants.
  kindling/         Pull rules, pity, spark, duplicates, exact odds analysis.
  descent/          Run generation and state.
  profile.ts        The player's whole save and every way to change it.
packages/content  Heroes, cards, enemies, stages, banners, Glimmers, with schema validation.
apps/web          Vite + Preact + PixiJS client.
tools/sim         Headless simulator used to balance the game.
docs/roadmap.html The roadmap.
```

## Development

```sh
pnpm typecheck    # TypeScript, strict
pnpm test         # Vitest across packages
pnpm build        # production build to apps/web/dist
pnpm check        # all three
pnpm sim all      # balance report: battles, sensitivity, Descent, Kindling, roster
```

### Design notes

- **Deterministic.** All randomness is a seeded generator whose state is plain JSON. A battle, a Descent run or a Kindling session replays exactly from its seed and inputs, which makes bugs reproducible and balance testable.
- **The client only draws.** Rules live in `packages/core`. The screen plays the engine's events back as animation and then re-syncs from the engine's state.
- **Balance is measured, not guessed.** `tools/sim` plays the campaign and Descent with the same heuristic that powers auto-battle. `packages/content/src/balance.test.ts` fails if stage difficulty drifts out of its target band.
- **Fair odds.** The gacha rules are data (`BannerRules`). The Odds page, the pull code and the tests all read the same definition; the tests run a million simulated pulls and compare them with an exact dynamic-programming analysis.
- **Art is generated.** Heroes, foes and cards are procedural SVG drawn from small `Look` records, so the repository has no binary art and every character can be restyled in code. Fonts are Dela Gothic One, Chakra Petch and Zen Kaku Gothic New via `@fontsource`.

### Legal

No license has been chosen yet, so the code is all rights reserved for now. The setting, names and characters are original; the game takes inspiration from JRPG conventions and does not use anyone's characters, art or music.
