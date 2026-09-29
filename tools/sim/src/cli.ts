import {
  analyzeRules,
  battleFor,
  chooseNode,
  choices,
  finishBattle,
  pickGlimmer,
  startRun,
  takeRest,
  type CrewMember,
  type DescentRun,
  encounterFoes,
  heroUnit,
  newKindlingState,
  playout,
  pullInPlace,
  recommendParty,
  seedRng,
  type BattleSetup,
  type StageDef,
} from '@duskline/core';
import {
  DESCENT_POOLS,
  HEROES,
  STAGES,
  descentDeps,
  heroById,
  ownedHeroIdsBefore,
  rankBefore,
  rateUpBanner,
  requireEncounter,
  requireEnemy,
  requireHero,
} from '@duskline/content';

/**
 * Headless simulations for balance and economy.
 *
 *   pnpm sim battles [--n 300] [--stage 1-5]   story stages with the auto-play policy
 *   pnpm sim kindling [--pulls 1000000]        pull odds against the exact analysis
 *   pnpm sim all                               both
 */

const args = process.argv.slice(2);
const cmd = args[0] ?? 'all';
const flag = (name: string, fallback: number): number => {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const only = (() => {
  const i = args.indexOf('--stage');
  return i >= 0 ? args[i + 1] : undefined;
})();

/** Experimental multipliers on top of the content data, to find good numbers before editing it. */
const tune = {
  hp: flag('hp', 1),
  atk: flag('atk', 1),
  def: flag('def', 1),
  shell: flag('shell', 0),
  eliteHp: flag('eliteHp', 1),
  bossHp: flag('bossHp', 1),
  bossAtk: flag('bossAtk', 1),
  bossShell: flag('bossShell', 0),
  skip: flag('skipTutorial', 0),
};

function stageSetup(stage: StageDef, index: number, rankDelta = 0): { setup: BattleSetup; party: string[] } {
  const encounter = requireEncounter(stage.encounter);
  const owned = ownedHeroIdsBefore(index).map((id) => requireHero(id));
  const foesDefs = encounter.foes.map((f) => requireEnemy(f.enemy));
  const partyIds = stage.forcedParty ?? recommendParty(owned, foesDefs);
  const rank = Math.max(1, rankBefore(index) + rankDelta);
  const foes = encounterFoes(encounter, stage.level, requireEnemy);
  if (!(tune.skip && index === 0)) {
    for (const f of foes) {
      const boss = f.tier === 'boss';
      const elite = f.tier === 'elite';
      f.stats = {
        hp: f.stats.hp * tune.hp * (elite ? tune.eliteHp : 1) * (boss ? tune.bossHp : 1),
        atk: f.stats.atk * tune.atk * (boss ? tune.bossAtk : 1),
        def: f.stats.def * tune.def,
        spd: f.stats.spd,
      };
      f.shell = (f.shell ?? 0) + tune.shell + (boss ? tune.bossShell : 0);
    }
  }
  return {
    party: partyIds,
    setup: { party: partyIds.map((id) => heroUnit(requireHero(id), rank)), foes },
  };
}

const pct = (x: number): string => `${(x * 100).toFixed(0)}%`.padStart(4);
const num = (x: number, d = 1): string => x.toFixed(d).padStart(6);

function battles(): void {
  const n = flag('n', 300);
  console.log(`\nStory stages: ${n} seeded battles each, auto-play policy, on-curve party\n`);
  console.log('stage  name                    lvl rank  win   partyTurns  actions  ~min   hp left dmg%  break  encore  pass  burst  ult   KOs  foeActs skips  party');
  for (const [index, stage] of STAGES.entries()) {
    if (only && stage.id !== only) continue;
    const { setup, party } = stageSetup(stage, index);
    const partyMax = setup.party.reduce((a, u) => a + u.stats.hp, 0);
    let wins = 0;
    let timeouts = 0;
    const sum = { turns: 0, actions: 0, hp: 0, breaks: 0, encores: 0, passes: 0, bursts: 0, ults: 0, kos: 0, foeActs: 0, foeSkips: 0, dmg: 0 };
    for (let seed = 0; seed < n; seed++) {
      const r = playout(setup, `${stage.id}:${seed}`);
      if (r.result === 'victory') wins++;
      if (r.timedOut) timeouts++;
      sum.turns += r.turns;
      sum.actions += r.actions;
      sum.hp += r.partyHpFrac;
      sum.breaks += r.stats.breaks;
      sum.encores += r.stats.encores;
      sum.passes += r.stats.passes;
      sum.bursts += r.stats.bursts;
      sum.ults += r.stats.ultimates;
      sum.kos += r.stats.partyKos;
      sum.foeActs += r.stats.foeActions;
      sum.dmg += r.stats.damageTaken / partyMax;
      sum.foeSkips += r.stats.foeSkips;
    }
    const avg = (v: number): number => v / n;
    // A tap takes about five seconds including animation, so this is the time a player spends deciding.
    const minutes = (avg(sum.actions) * 5) / 60;
    console.log(
      `${stage.id.padEnd(6)} ${stage.name.padEnd(23)} ${String(stage.level).padStart(3)} ${String(rankBefore(index)).padStart(4)} ${pct(wins / n)} ${num(avg(sum.turns))}      ${num(avg(sum.actions))} ${num(minutes)} ${pct(avg(sum.hp))} ${pct(avg(sum.dmg))}    ${num(avg(sum.breaks))} ${num(avg(sum.encores))} ${num(avg(sum.passes))} ${num(avg(sum.bursts))} ${num(avg(sum.ults))} ${num(avg(sum.kos), 2)} ${num(avg(sum.foeActs))} ${num(avg(sum.foeSkips))}  ${party.join(',')}` +
        (timeouts ? `  !! ${timeouts} timeouts` : ''),
    );
  }
}

function sensitivity(): void {
  const n = flag('n', 200);
  console.log(`\nRank sensitivity: win rate when the party is under or over-levelled (${n} battles per cell)\n`);
  console.log('stage   -2    -1     0    +1    +2');
  for (const [index, stage] of STAGES.entries()) {
    if (only && stage.id !== only) continue;
    const cells: string[] = [];
    for (const delta of [-2, -1, 0, 1, 2]) {
      const { setup } = stageSetup(stage, index, delta);
      let wins = 0;
      for (let seed = 0; seed < n; seed++) if (playout(setup, `${stage.id}:s${seed}`).result === 'victory') wins++;
      cells.push(pct(wins / n));
    }
    console.log(`${stage.id.padEnd(6)} ${cells.join('  ')}`);
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

/** A player who rests when hurt, takes elites when healthy, and leans into one Path. */
/** A crew with no defender or healer should lean on defensive Glimmers. */
function needsSustain(ids: string[]): boolean {
  const roles = ids.map((id) => requireHero(id).role);
  return !roles.includes('defender') || !roles.includes('healer');
}

function playRun(run: DescentRun, leanDefensive = false): void {
  let guard = 0;
  while (run.phase !== 'done' && guard++ < 80) {
    if (run.phase === 'choose') {
      const options = choices(run);
      const avg = Object.values(run.hp).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(run.hp).length);
      const rest = options.find((n) => n.kind === 'rest');
      const elite = options.find((n) => n.kind === 'elite');
      const battle = options.find((n) => n.kind === 'battle' || n.kind === 'boss');
      chooseNode(run, (avg < 0.65 && rest ? rest : avg >= 0.85 && elite ? elite : (battle ?? options[0]!)).id);
    } else if (run.phase === 'rest') {
      takeRest(run);
    } else if (run.phase === 'battle') {
      const { setup, seed } = battleFor(run, descentDeps);
      const out = playout(setup, seed);
      finishBattle(run, descentDeps, { victory: out.result === 'victory', hp: out.partyHp, actions: out.actions });
    } else if (run.phase === 'glimmer') {
      const best = [...(run.offer ?? [])].sort((a, b) => {
        const ga = descentDeps.glimmer(a);
        const gb = descentDeps.glimmer(b);
        const score = (g: typeof ga): number => g.rarity * 2 + run.pathScore[g.path] + (leanDefensive && g.path === 'nightward' ? 3 : 0);
        return score(gb) - score(ga);
      })[0]!;
      pickGlimmer(run, descentDeps, best);
    }
  }
}

function descent(): void {
  const n = flag('n', 200);
  const rank = flag('rank', 8);
  console.log(`\nDescent: ${n} full runs, policy player, crew at Rank ${rank} (${'daily seeds differ per run'})\n`);
  console.log('crew                          clear  floors  battles  actions  ~min@5s  ~min@auto2x  fails on');
  const crews: string[][] = [
    ['wren', 'io', 'marisol', 'pip'],
    ['aurelian', 'tamsin', 'marisol', 'pip'],
    ['wren', 'io', 'tamsin', 'pip'],
    ['aurelian', 'io', 'marisol', 'pip'],
    ['wren', 'tamsin', 'marisol', 'pip'],
    ['aurelian', 'io', 'marisol', 'tamsin'],
    ['wren', 'io', 'tamsin', 'aurelian'],
  ];
  for (const ids of crews) {
    const crew: CrewMember[] = ids.map((hero) => ({ hero, resonance: 1, card: null, copies: 0 }));
    let cleared = 0;
    const sum = { floors: 0, battles: 0, actions: 0 };
    const fails = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const run = startRun({ seed: `sim-${ids.join('')}-${i}`, daily: null, crew, rank, pools: DESCENT_POOLS }, descentDeps);
      playRun(run, needsSustain(ids));
      if (run.result === 'cleared') cleared++;
      else fails[Math.min(2, run.floor)]!++;
      sum.floors += run.stats.floorsCleared;
      sum.battles += run.stats.battles;
      sum.actions += run.stats.actions;
    }
    const avg = (v: number): number => v / n;
    console.log(
      `${ids.join(',').padEnd(29)} ${pct(cleared / n)}  ${num(avg(sum.floors))}  ${num(avg(sum.battles))}   ${num(avg(sum.actions), 0)}   ${num((avg(sum.actions) * 5) / 60)}     ${num((avg(sum.actions) * 2.5) / 60)}      f1 ${fails[0]} f2 ${fails[1]} f3 ${fails[2]}`,
    );
  }
}

function roster(): void {
  console.log('\nRoster at Rank 1, resonance 1\n');
  console.log('hero        role      aff    hp   atk  def  spd');
  for (const h of HEROES) {
    const b = heroById(h.id)!.base;
    console.log(`${h.id.padEnd(11)} ${h.role.padEnd(9)} ${h.affinity.padEnd(6)} ${String(b.hp).padStart(4)} ${String(b.atk).padStart(4)} ${String(b.def).padStart(4)} ${String(b.spd).padStart(4)}`);
  }
}

switch (cmd) {
  case 'battles':
    battles();
    break;
  case 'sensitivity':
    sensitivity();
    break;
  case 'kindling':
    kindling();
    break;
  case 'roster':
    roster();
    break;
  case 'descent':
    descent();
    break;
  case 'all':
    battles();
    sensitivity();
    descent();
    kindling();
    break;
  default:
    console.error(`Unknown command "${cmd}". Try: battles, sensitivity, descent, kindling, roster, all`);
    process.exitCode = 1;
}
