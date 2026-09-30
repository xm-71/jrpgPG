# Art looks: review samples

Prototype code that draws Wren and the Unturning Acolyte in seven anime looks (Dragon Ball, Jujutsu Kaisen,
Demon Slayer, Solo Leveling, Bleach, Dandadan, One Piece) for the "Duskline: seven anime looks" review doc.
Nothing here is used by the game yet. Once a look is chosen, it gets built properly into `apps/web/src/art`.

```sh
mkdir -p out
../../tools/sim/node_modules/.bin/tsx build.ts db.hero db.fade   # writes out/<look>-<part>.svg
node render.cjs db-hero db-fade                                   # PNGs via Chromium
```
