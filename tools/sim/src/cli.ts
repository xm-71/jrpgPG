import {
  analyzeRules,
  autoClimb,
  autoPlay,
  battleSetup,
  createBattle,
  newKindlingState,
  pullInPlace,
  seedRng,
  startClimb,
  type ClimbRun,
  type NodeKind,
} from '@duskline/core';
import { HEROES, STRATA, climbDeps, rateUpBanner } from '@duskline/content';

/**
 * Headless simulations for balance and economy.
 *
 *   pnpm sim climb [--n 120] [--stratum 0] [--hero wren] [--rank 1] [--res 1]   whole climbs with the plain auto-climber
 *   pnpm sim fights [--n 60] [--stratum 0]                                       every encounter, starter deck, full HP
 *   pnpm sim kindling [--pulls 1000000]                                          pull odds against the exact analysis
 *   pnpm sim all
 */

const args = process.argv.slice(2);
const cmd = args[0] ?? 'all';
const flag = (name: string, fallback: number): number => {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const text = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const pct = (v: number): string => `${(v * 100).toFixed(0).padStart(3)}%`;
const f1 = (v: number): string => v.toFixed(1).padStart(5);
const strata = (): number[] => {
  const s = text('stratum');
  return s === undefined ? STRATA.map((_, i) => i) : [Number(s)];
};
const heroes = (): string[] => {
  const h = text('hero');
  return h ? [h] : HEROES.map((x) => x.id);
};

interface FightLog {
  kind: string;
  encounter: string;
  victory: boolean;
  lost: number;
  turns: number;
  floor: number;
}

function climb(): void {
  const n = flag('n', 120);
  const rank = flag('rank', 1);
  const res = flag('res', 1);
  for (const s of strata()) {
    console.log(`\n${STRATA[s]!.name}: ${n} climbs per hero, Rank ${rank}, Resonance ${res}\n`);
    console.log('hero        clear  floors fights  turns  lost/battle  elite  guard   boss  deck  died on');
    const allDeaths = new Map<string, number>();
    let totalClear = 0;
    for (const hero of heroes()) {
      const logs: FightLog[] = [];
      let clears = 0;
      let floors = 0;
      let deck = 0;
      const deaths = new Map<string, number>();
      for (let i = 0; i < n; i++) {
        const run: ClimbRun = startClimb({ seed: `sim-${s}-${hero}-${i}`, daily: null, stratum: s, hero, resonance: res, rank, kindled: {}, archive: [] }, climbDeps);
        autoClimb(run, climbDeps, {
          onFight: (f) => {
            logs.push({ kind: f.kind, encounter: f.encounter, victory: f.victory, lost: Math.max(0, f.hpBefore - f.hpAfter), turns: f.turns, floor: f.floor });
            if (!f.victory) {
              const key = `${f.kind} ${f.encounter}`;
              deaths.set(key, (deaths.get(key) ?? 0) + 1);
              allDeaths.set(key, (allDeaths.get(key) ?? 0) + 1);
            }
          },
        });
        if (run.result === 'cleared') clears++;
        floors += run.stats.floorsCleared;
        deck += run.deck.length;
      }
      totalClear += clears;
      const of = (k: NodeKind) => logs.filter((l) => l.kind === k);
      const winRate = (k: NodeKind) => {
        const l = of(k);
        return l.length ? l.filter((x) => x.victory).length / l.length : NaN;
      };
      const battles = of('battle');
      const worst = [...deaths.entries()].sort((a, b) => b[1] - a[1])[0];
      console.log(
        `${hero.padEnd(10)} ${pct(clears / n)}  ${f1(floors / n)}  ${f1(logs.length / n)} ${f1(logs.reduce((a, l) => a + l.turns, 0) / Math.max(1, logs.length))}   ${f1(
          battles.reduce((a, l) => a + l.lost, 0) / Math.max(1, battles.length),
        )}       ${pct(winRate('elite'))}  ${pct(winRate('guardian'))}  ${pct(winRate('boss'))}  ${f1(deck / n)}  ${worst ? `${worst[0]} (${worst[1]})` : '-'}`,
      );
    }
    console.log(`\nall heroes: ${pct(totalClear / (n * heroes().length))} cleared`);
    const top = [...allDeaths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    console.log(`deadliest: ${top.map(([k, v]) => `${k} ${v}`).join(' | ')}`);
  }
}

/** Every encounter in a stratum against every hero's starter deck at full HP. */
function fights(): void {
  const n = flag('n', 40);
  for (const s of strata()) {
    const st = STRATA[s]!;
    console.log(`\n${st.name}: each encounter, starter decks, full HP, ${n} seeds per hero\n`);
    console.log('floor encounter            kind      win   lost%  turns');
    const rows: Array<{ floor: number; id: string; kind: NodeKind }> = [];
    st.floors.forEach((f, i) => {
      for (const id of f.battles) rows.push({ floor: i, id, kind: 'battle' });
      for (const id of st.elites) rows.push({ floor: i, id, kind: 'elite' });
      rows.push({ floor: i, id: f.guardian, kind: i === 2 ? 'boss' : 'guardian' });
    });
    for (const r of rows) {
      let wins = 0;
      let lost = 0;
      let turns = 0;
      let count = 0;
      for (const hero of heroes()) {
        for (let i = 0; i < n; i++) {
          const run = startClimb({ seed: `f-${hero}-${i}`, daily: null, stratum: s, hero, resonance: 1, rank: 1, kindled: {}, archive: [] }, climbDeps);
          run.phase = 'battle';
          run.floor = r.floor;
          run.battle = { encounter: r.id, kind: r.kind, seed: `fs-${r.id}-${hero}-${i}` };
          const { state } = createBattle(battleSetup(run, climbDeps), run.battle.seed);
          autoPlay(state);
          count++;
          if (state.result === 'victory') wins++;
          lost += (state.hero.maxHp - state.hero.hp) / state.hero.maxHp;
          turns += state.turn;
        }
      }
      console.log(`${String(r.floor + 1).padStart(5)} ${r.id.padEnd(22)} ${r.kind.padEnd(8)} ${pct(wins / count)}  ${pct(lost / count)}  ${f1(turns / count)}`);
    }
  }
}

function kindling(): void {
  const total = flag('pulls', 1_000_000);
  const banner = rateUpBanner(0);
  const analysis = analyzeRules(banner.rules);
  const rng = seedRng('sim-kindling');
  const state = newKindlingState();
  const counts = { 5: 0, 4: 0, 3: 0 } as Record<number, number>;
  let featuredFives = 0;
  let softs = 0;
  let hards = 0;
  for (let i = 0; i < total; i++) {
    const r = pullInPlace(banner, state, rng, { history: false });
    counts[r.rarity] = (counts[r.rarity] ?? 0) + 1;
    if (r.rarity === 5 && r.featured) featuredFives++;
    if (r.pity === 'soft') softs++;
    if (r.pity === 'hard') hards++;
  }
  console.log(`\nKindling: ${total.toLocaleString()} pulls on "${banner.name}"\n`);
  console.log(`5-star rate        ${((counts[5]! / total) * 100).toFixed(2)}%   (base ${(banner.rules.five.base * 100).toFixed(1)}%, so pity lifts it)`);
  console.log(`4-star rate        ${((counts[4]! / total) * 100).toFixed(2)}%`);
  console.log(`pulls per 5-star   ${(total / counts[5]!).toFixed(2)}   exact ${analysis.avgPullsPerFive.toFixed(2)}`);
  console.log(`featured share     ${((featuredFives / counts[5]!) * 100).toFixed(1)}%   exact ${(analysis.featuredShareOverall * 100).toFixed(1)}%`);
  console.log(`soft / hard pity   ${softs.toLocaleString()} / ${hards.toLocaleString()} of ${counts[5]!.toLocaleString()} 5-stars`);
  console.log(`to the featured 5-star from scratch: median ${analysis.medianToFeatured}, 90% by ${analysis.p90ToFeatured}, certain by ${analysis.worstCaseToFeatured}`);
  const week = 20;
  console.log(`at ${week} free pulls a week that is about ${(analysis.medianToFeatured! / week).toFixed(1)} weeks (median) and ${(analysis.p90ToFeatured! / week).toFixed(1)} weeks (90%)`);
}

switch (cmd) {
  case 'climb':
    climb();
    break;
  case 'fights':
    fights();
    break;
  case 'kindling':
    kindling();
    break;
  case 'all':
    fights();
    climb();
    kindling();
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
}
