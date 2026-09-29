import type { EnemyDef, HeroDef } from './data';
import type { Affinity } from './types';

/** Every affinity a hero can strike with. */
export function heroAffinities(h: HeroDef): Set<Affinity> {
  const out = new Set<Affinity>();
  for (const s of [h.kit.basic, h.kit.skill, h.kit.ultimate]) if (s.affinity && s.power > 0) out.add(s.affinity);
  return out;
}

function scoreTeam(team: readonly HeroDef[], foes: readonly EnemyDef[]): number {
  let score = 0;
  for (const f of foes) {
    const hits = team.filter((h) => {
      const aff = heroAffinities(h);
      return f.weaknesses.some((w) => aff.has(w));
    }).length;
    if (hits > 0) score += 3 + 3 * Math.min(hits, 2);
  }
  if (team.some((h) => h.role === 'healer')) score += 4;
  if (team.some((h) => h.role === 'defender')) score += 2;
  if (team.some((h) => h.role === 'support' || h.role === 'debuffer')) score += 1;
  // Tie-break toward stronger heroes.
  for (const h of team) score += (h.base.atk + h.base.hp / 8) / 1000;
  return score;
}

/**
 * A sensible party for a fight: covers the enemies' weaknesses first, then wants some sustain.
 * The client offers it as "Recommended", and the simulations use it as their player.
 */
export function recommendParty(heroes: readonly HeroDef[], foes: readonly EnemyDef[], size = 4): string[] {
  if (heroes.length <= size) return heroes.map((h) => h.id);
  let best: HeroDef[] = [];
  let bestScore = -Infinity;
  const pick: HeroDef[] = [];
  const walk = (start: number): void => {
    if (pick.length === size) {
      const score = scoreTeam(pick, foes);
      if (score > bestScore) {
        bestScore = score;
        best = [...pick];
      }
      return;
    }
    for (let i = start; i < heroes.length; i++) {
      pick.push(heroes[i] as HeroDef);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return best.map((h) => h.id);
}
