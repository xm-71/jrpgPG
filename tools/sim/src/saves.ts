import {
  applyPulls,
  archiveEcho,
  autoClimb,
  climbStart,
  dueBeats,
  firstKindling,
  newProfile,
  pullManyInPlace,
  seeBeat,
  seedRng,
  settleClimb,
  startClimb,
  type Profile,
} from '@duskline/core';
import { BEATS, FIRST_KINDLING_HERO, STARTER_HEROES, bannerById, catalog, climbDeps } from '@duskline/content';
import { writeFileSync } from 'node:fs';

/** Build saves in known states, for driving the client in a browser. Usage: tsx saves.ts <outdir> */
const out = process.argv[2] ?? '.';
const NOW = Date.parse('2026-09-29T10:00:00Z');

function seeAll(p: Profile): void {
  for (const b of dueBeats(p, BEATS)) {
    seeBeat(p, b, NOW);
    if (b.id === 'answering-lamp') firstKindling(p, FIRST_KINDLING_HERO, NOW);
  }
}

/** Climb with the auto-climber until the stratum is cleared, or give up after a few tries. */
function climbUntilClear(p: Profile, stratum: number, hero: string): void {
  for (let i = 0; i < 12; i++) {
    const run = startClimb(climbStart(p, { seed: `save-${stratum}-${hero}-${i}`, daily: null, stratum, hero }), climbDeps);
    autoClimb(run, climbDeps);
    for (const e of run.echoes.filter((x) => !run.archived.includes(x.id)).slice(0, 1)) archiveEcho(p, e);
    settleClimb(p, run, NOW);
    seeAll(p);
    if (run.result === 'cleared') return;
  }
}

const save = (name: string, p: Profile): void => writeFileSync(`${out}/${name}.json`, JSON.stringify(p));

const fresh = newProfile(NOW, STARTER_HEROES);
save('fresh', fresh);

const first = newProfile(NOW, STARTER_HEROES);
seeAll(first);
const r1 = startClimb(climbStart(first, { seed: 'save-first', daily: null, stratum: 0 }), climbDeps);
autoClimb(r1, climbDeps);
settleClimb(first, r1, NOW);
seeAll(first);
save('after-first', first);

const mid = newProfile(NOW, STARTER_HEROES);
seeAll(mid);
climbUntilClear(mid, 0, 'wren');
applyPulls(mid, pullManyInPlace(bannerById('rateup-0')!, mid.kindling, seedRng('save-mid'), 20, { at: NOW }), catalog, NOW);
save('mid', mid);

const late = newProfile(NOW, STARTER_HEROES);
seeAll(late);
climbUntilClear(late, 0, 'wren');
climbUntilClear(late, 1, 'io');
applyPulls(late, pullManyInPlace(bannerById('rateup-0')!, late.kindling, seedRng('save-late'), 57, { at: NOW }), catalog, NOW);
late.gloam += 3000;
late.hero = 'io';
save('late', late);
console.log('saves written to', out, '| late roster:', Object.keys(late.collection.heroes).join(','), '| cards:', Object.keys(late.collection.cards).length, '| archive:', late.archive.length, '| beats:', late.progress.beats.join(','));
