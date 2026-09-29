import { describe, expect, test } from 'vitest';
import { createBattle } from '../cards/engine';
import { autoPlay } from '../cards/policy';
import { climbDeps as deps } from '../testfixtures';
import { autoClimb } from './auto';
import { FLOORS, generateFloor } from './map';
import {
  battleSetup,
  buy,
  cardTable,
  chooseEvent,
  finishFight,
  leaveEvent,
  leaveShop,
  mapChoices,
  maxHpFor,
  moveTo,
  pickCard,
  pickGlimmer,
  rest,
  startClimb,
  takeEcho,
  takeReward,
  type StartClimb,
} from './run';
import type { ClimbRun, MapNode } from './types';

const start = (o: Partial<StartClimb> = {}): ClimbRun =>
  startClimb({ seed: 'test', daily: null, stratum: 0, hero: 'wren', resonance: 1, rank: 1, kindled: {}, archive: [], ...o }, deps);

function begin(o: Partial<StartClimb> = {}): ClimbRun {
  const run = start(o);
  pickGlimmer(run, deps, run.glimmerOffer![0]!);
  return run;
}

/** Walk to the first node of a kind that is reachable right now, if any. */
function stepTo(run: ClimbRun, kind: MapNode['kind']): boolean {
  const n = mapChoices(run).find((x) => x.kind === kind);
  if (!n) return false;
  moveTo(run, deps, n.id);
  return true;
}

function win(run: ClimbRun): void {
  const { state } = createBattle(battleSetup(run, deps), run.battle!.seed);
  autoPlay(state);
  finishFight(run, deps, { victory: state.result === 'victory', hp: state.hero.hp, stats: state.stats });
}

describe('floor maps', () => {
  const s = deps.stratum(0);

  test('every node leads up a row, every node can be reached, and each floor ends in one fight', () => {
    for (let i = 0; i < 40; i++) {
      for (let f = 0; f < FLOORS; f++) {
        const map = generateFloor(`m${i}`, s, f, new Set());
        const last = map.rows[map.rows.length - 1]!;
        expect(last).toHaveLength(1);
        expect(last[0]!.kind).toBe(f === FLOORS - 1 ? 'boss' : 'guardian');
        for (let r = 0; r < map.rows.length - 1; r++) {
          const above = new Set(map.rows[r + 1]!.map((n) => n.id));
          for (const n of map.rows[r]!) {
            expect(n.next.length).toBeGreaterThan(0);
            for (const id of n.next) expect(above.has(id)).toBe(true);
          }
          for (const m of map.rows[r + 1]!) expect(map.rows[r]!.some((n) => n.next.includes(m.id))).toBe(true);
        }
        const kinds = map.rows.flat().map((n) => n.kind);
        expect(kinds).toContain('rest');
        expect(kinds).toContain('shop');
        expect(kinds).toContain('mirror');
        for (const n of map.rows.flat()) {
          if (n.kind === 'battle' || n.kind === 'elite' || n.kind === 'guardian' || n.kind === 'boss') expect(n.encounter).toBeTruthy();
          if (n.kind === 'event') expect(n.event).toBeTruthy();
        }
      }
    }
  });

  test('the same seed draws the same floor', () => {
    expect(generateFloor('same', s, 1, new Set())).toEqual(generateFloor('same', s, 1, new Set()));
  });

  test('a stratum can keep elites off its early floors', () => {
    const gentle = { ...s, eliteFrom: 1 };
    const elitesOn = (f: number, def = gentle): number =>
      Array.from({ length: 60 }, (_, i) => generateFloor(`e${i}`, def, f, new Set()).rows.flat().filter((n) => n.kind === 'elite').length).reduce((a, b) => a + b, 0);
    expect(elitesOn(0)).toBe(0);
    expect(elitesOn(1)).toBeGreaterThan(0);
    expect(elitesOn(0, { ...s, eliteFrom: 0 })).toBeGreaterThan(0);
  });
});

describe('starting a climb', () => {
  test('the hero brings their starter deck and a free Glimmer choice', () => {
    const run = start();
    expect(run.deck.map((c) => c.id)).toEqual(deps.hero('wren').starter);
    expect(run.hp).toBe(60);
    expect(run.phase).toBe('glimmer');
    expect(run.glimmerOffer).toHaveLength(3);
    pickGlimmer(run, deps, run.glimmerOffer![0]!);
    expect(run.phase).toBe('map');
    expect(mapChoices(run)).toHaveLength(2);
  });

  test('Resonance and Rank add max HP; Resonance 3 tempers the hero’s own cards', () => {
    expect(maxHpFor(60, 3, 5)).toBe(66 + 4);
    const run = start({ resonance: 3 });
    expect(run.deck.filter((c) => c.up).map((c) => c.id)).toEqual(['wren.sig', 'wren.sig']);
  });
});

describe('fights and spoils', () => {
  test('a won fight carries HP over and offers Embers and cards, including a bound Fade', () => {
    const run = begin();
    moveTo(run, deps, mapChoices(run)[0]!.id);
    expect(run.phase).toBe('battle');
    const setup = battleSetup(run, deps);
    expect(setup.hero.hp).toBe(run.hp);
    expect(Object.keys(cardTable(run, deps))).toContain('wren.ult');
    win(run);
    expect(run.phase).toBe('reward');
    expect(run.reward!.embers).toBeGreaterThanOrEqual(14);
    expect(run.reward!.cards).toHaveLength(3);
    const before = run.deck.length;
    takeReward(run, 0);
    expect(run.deck).toHaveLength(before + 1);
    expect(run.phase).toBe('map');
  });

  test('bound Fades turn up often after fights with foes that can be bound', () => {
    let seen = 0;
    for (let i = 0; i < 30; i++) {
      const run = begin({ seed: `bind${i}` });
      moveTo(run, deps, mapChoices(run)[0]!.id);
      win(run);
      if (run.reward?.cards.some((c) => c.id === 'bound.wisp')) seen++;
    }
    expect(seen).toBeGreaterThan(10);
  });

  test('a lost fight ends the climb', () => {
    const run = begin();
    moveTo(run, deps, mapChoices(run)[0]!.id);
    const { state } = createBattle(battleSetup(run, deps), 'x');
    finishFight(run, deps, { victory: false, hp: 0, stats: state.stats });
    expect(run.phase).toBe('done');
    expect(run.result).toBe('failed');
  });
});

describe('shops, rests, Mirrors and events', () => {
  /** Walk the floor with auto-fights until a node of this kind is on offer. */
  function reach(kind: MapNode['kind'], seed: string): ClimbRun | null {
    const run = begin({ seed });
    for (let guard = 0; guard < 12; guard++) {
      if (run.phase === 'map' && stepTo(run, kind)) return run;
      if (run.phase === 'map') moveTo(run, deps, mapChoices(run)[0]!.id);
      if (run.phase === 'battle') win(run);
      if (run.phase === 'reward') takeReward(run, null);
      if (run.phase === 'glimmer') pickGlimmer(run, deps, run.glimmerOffer![0]!);
      if (run.phase === 'event') {
        chooseEvent(run, deps, deps.event(run.event!.id).choices.length - 1);
        leaveEvent(run, deps);
      }
      if (run.phase === 'shop') leaveShop(run);
      if (run.phase === 'rest') rest(run, deps, 'heal');
      if (run.phase === 'mirror') takeEcho(run, null);
      if (run.phase === 'done' || run.floor > 0) return null;
    }
    return null;
  }

  function find(kind: MapNode['kind']): ClimbRun {
    for (let i = 0; i < 40; i++) {
      const run = reach(kind, `${kind}${i}`);
      if (run) return run;
    }
    throw new Error(`Could not reach a ${kind}`);
  }

  test('the shop sells cards and removes one, charging only when a card is chosen', () => {
    const run = find('shop');
    run.embers = 500;
    const shop = run.shop!;
    const cardAt = shop.findIndex((s) => s.kind === 'card');
    const deckBefore = run.deck.length;
    buy(run, deps, cardAt);
    expect(run.deck).toHaveLength(deckBefore + 1);
    expect(run.embers).toBe(500 - shop[cardAt]!.price);
    const removeAt = shop.findIndex((s) => s.kind === 'remove');
    const embers = run.embers;
    buy(run, deps, removeAt);
    expect(run.phase).toBe('pick');
    pickCard(run, deps, null);
    expect(run.embers).toBe(embers);
    buy(run, deps, removeAt);
    pickCard(run, deps, run.deck[0]!.uid);
    expect(run.deck).toHaveLength(deckBefore);
    expect(run.embers).toBe(embers - shop[removeAt]!.price);
    expect(run.removePrice).toBeGreaterThan(shop[removeAt]!.price);
    leaveShop(run);
    expect(run.phase).toBe('map');
  });

  test('a rest heals or tempers', () => {
    const run = find('rest');
    run.hp = 10;
    rest(run, deps, 'heal');
    expect(run.hp).toBe(10 + Math.round(run.maxHp * 0.3));
    const again = find('rest');
    rest(again, deps, 'temper');
    const target = again.deck.find((c) => c.id === 'cut')!;
    pickCard(again, deps, target.uid);
    expect(target.up).toBe(true);
    expect(again.phase).toBe('map');
  });

  test('a Mirror offers Echoes shaped by the climb, and taking one puts it in the deck and the card table', () => {
    const run = find('mirror');
    expect(run.mirror).toHaveLength(2);
    const echo = run.mirror![0]!;
    expect(echo.id.startsWith('echo:')).toBe(true);
    takeEcho(run, 0);
    expect(run.deck.some((c) => c.id === echo.id)).toBe(true);
    expect(run.stats.echoesTaken).toBe(1);
    expect(Object.keys(cardTable(run, deps))).toContain(echo.id);
  });

  test('an event resolves a choice, and can lead into a fight', () => {
    const run = find('event');
    const def = deps.event(run.event!.id);
    const fight = def.choices.findIndex((c) => c.outcome.some((o) => o.type === 'fight'));
    if (fight >= 0) {
      chooseEvent(run, deps, fight);
      expect(run.event!.text).toBe(def.choices[fight]!.after);
      leaveEvent(run, deps);
      expect(run.phase).toBe('battle');
    } else {
      chooseEvent(run, deps, 0);
      expect(run.event!.text).toBeTruthy();
      leaveEvent(run, deps);
      expect(['map', 'glimmer', 'pick', 'battle', 'mirror']).toContain(run.phase);
    }
  });
});

describe('a whole climb', () => {
  test('ends cleared or failed, with a sane deck and HP, for many seeds', () => {
    let cleared = 0;
    for (let i = 0; i < 25; i++) {
      const run = autoClimb(start({ seed: `whole${i}` }), deps);
      expect(run.phase).toBe('done');
      expect(['cleared', 'failed']).toContain(run.result);
      expect(run.hp).toBeGreaterThanOrEqual(0);
      expect(run.hp).toBeLessThanOrEqual(run.maxHp);
      expect(run.deck.length).toBeGreaterThanOrEqual(5);
      if (run.result === 'cleared') {
        cleared++;
        expect(run.stats.floorsCleared).toBe(FLOORS);
      }
    }
    expect(cleared).toBeGreaterThan(0);
  });

  test('replays exactly from its seed', () => {
    const a = autoClimb(start({ seed: 'replay' }), deps);
    const b = autoClimb(start({ seed: 'replay' }), deps);
    expect(a).toEqual(b);
  });
});
