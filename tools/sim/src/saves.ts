import { applyPulls, clearStage, firstKindling, newProfile, pullManyInPlace, seedRng, setParty, type Profile } from '@duskline/core';
import { STAGES, STARTER_HEROES, bannerById, catalog } from '@duskline/content';
import { writeFileSync } from 'node:fs';

/** Build saves in known states, for driving the client in a browser. Usage: tsx saves.ts <outdir> */
const out = process.argv[2] ?? '.';
const NOW = Date.parse('2026-09-29T10:00:00Z');

function upTo(p: Profile, stageId: string): void {
  for (const s of STAGES) {
    clearStage(p, s, NOW);
    if (s.id === '0-1') firstKindling(p, 'io', NOW);
    if (s.id === stageId) break;
  }
}

const save = (name: string, p: Profile): void => writeFileSync(`${out}/${name}.json`, JSON.stringify(p));

const fresh = newProfile(NOW, STARTER_HEROES);
save('fresh', fresh);

const afterFirst = newProfile(NOW, STARTER_HEROES);
clearStage(afterFirst, STAGES[0]!, NOW);
save('after-0-1', afterFirst);

const early = newProfile(NOW, STARTER_HEROES);
upTo(early, '0-2');
save('after-0-2', early);

const mid = newProfile(NOW, STARTER_HEROES);
upTo(mid, '1-2');
save('after-1-2', mid);

const late = newProfile(NOW, STARTER_HEROES);
upTo(late, '1-5');
const banner = bannerById('rateup-0')!;
const rng = seedRng('save-late');
applyPulls(late, pullManyInPlace(banner, late.kindling, rng, 47, { at: NOW }), catalog, NOW);
late.gloam += 3000;
setParty(late, ['wren', 'io', 'marisol', 'pip']);
save('late', late);
console.log('saves written to', out, '| late roster:', Object.keys(late.collection.heroes).join(','), '| cards:', Object.keys(late.collection.cards).length);
