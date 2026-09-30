import { describe, expect, test } from 'vitest';
import { addToStyle, generateEcho, newStyle } from './echo';
import { CardBattle, cloneState, createBattle, incoming, submitAction } from './engine';
import { autoPlay, chooseCardAction } from './policy';
import { LATE_TURN } from './rules';
import { cardText } from './text';
import { CARDS, allCards, arrange, foe, setupWith, uidOf } from './testkit';

const neutralFoe = (o = {}) => foe('dummy', { hp: 100, shell: 0, weaknesses: [], ...o });

describe('a new fight', () => {
  test('draws a hand of three and fills the Light', () => {
    const { state: s } = createBattle(setupWith({ deck: ['cut', 'cut', 'cut', 'brace', 'brace', 'brace'] }), 'a');
    expect(s.hand).toHaveLength(3);
    expect(s.draw).toHaveLength(3);
    expect(s.light).toBe(4);
    expect(s.turn).toBe(1);
    expect(s.foes[0]!.intent).toBe('bite');
  });
});

describe('play or hold', () => {
  test('playing a card spends Light, deals its damage and discards it', () => {
    const { state: s } = createBattle(setupWith({ deck: ['cut', 'brace', 'brace', 'cut'], foes: [neutralFoe()] }), 'b');
    arrange(s, ['cut', 'brace', 'brace']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut') });
    expect(s.foes[0]!.hp).toBe(94);
    expect(s.light).toBe(3);
    expect(s.discard.map((c) => c.id)).toEqual(['cut']);
  });

  test('cards still in hand at the end of the turn ward you, then go to the discard pile', () => {
    const { state: s } = createBattle(setupWith({ deck: ['cut', 'brace', 'brace', 'cut', 'cut'], foes: [neutralFoe({ moves: [{ id: 'maul', name: 'Maul', dmg: 20 }] })] }), 'c');
    arrange(s, ['cut', 'brace', 'brace']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut') });
    const braces = s.hand.map((c) => c.uid);
    expect(incoming(s)).toEqual({ damage: 20, pierce: 0, ward: 12, taken: 8 });
    const ev = submitAction(s, { type: 'end' });
    expect(ev.find((e) => e.t === 'held')).toMatchObject({ ward: 12 });
    expect(ev.find((e) => e.t === 'discard')).toEqual({ t: 'discard', uids: braces });
    expect(s.hero.hp).toBe(52);
    // A fresh hand of three for the new turn, and the ward is gone.
    expect(s.hand).toHaveLength(3);
    expect(s.hero.ward).toBe(0);
  });

  test('a Steadfast card stays in hand after it wards', () => {
    const cards = { ...CARDS, wall: { ...CARDS['brace']!, id: 'wall', keywords: ['steadfast' as const] } };
    const { state: s } = createBattle({ ...setupWith({ deck: ['wall', 'cut', 'cut', 'cut'], foes: [neutralFoe()] }), cards }, 'cc');
    arrange(s, ['wall', 'cut', 'cut']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut') });
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut') });
    submitAction(s, { type: 'end' });
    expect(s.hand.some((c) => c.id === 'wall')).toBe(true);
  });

  test('fleeting cards vanish instead of warding, and Ash is thrown away', () => {
    const { state: s } = createBattle(setupWith({ deck: ['flash', 'ash', 'brace', 'cut'], foes: [neutralFoe()] }), 'd');
    arrange(s, ['flash', 'ash', 'brace']);
    const ash = uidOf(s, 'ash');
    const ev = submitAction(s, { type: 'end' });
    expect(ev.find((e) => e.t === 'held')).toMatchObject({ ward: 6 });
    expect(s.spent.map((c) => c.id)).toEqual(['flash']);
    expect(ev.find((e) => e.t === 'discard')).toEqual({ t: 'discard', uids: [ash] });
  });
});

describe('Shell and Break', () => {
  test('weakness hits chip Shell; a Break cancels the intent, refills Light and draws a card', () => {
    const { state: s } = createBattle(setupWith({ deck: ['sun', 'sun', 'cut', 'cut', 'cut'] }), 'e');
    arrange(s, ['sun', 'sun', 'cut']);
    const f = s.foes[0]!;
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun'), target: f.id });
    expect(f.shell).toBe(1);
    expect(f.hp).toBe(24);
    const ev = submitAction(s, { type: 'play', uid: uidOf(s, 'sun'), target: f.id });
    // Chain ×2 (+20%) and weakness (+25%): 5 × 1.5 = 7.5, rounded to 8.
    expect(f.hp).toBe(16);
    expect(f.broken).toBe(true);
    expect(f.intent).toBeNull();
    expect(s.light).toBe(4);
    expect(s.hand).toHaveLength(2);
    expect(ev.some((e) => e.t === 'break')).toBe(true);

    // A Broken foe takes 50% more.
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut'), target: f.id });
    expect(f.hp).toBe(7);
  });

  test('a Broken foe loses its turn, then recovers Hardened until it acts again', () => {
    const { state: s } = createBattle(setupWith({ deck: ['sun', 'sun', 'sun', 'sun', 'cut', 'cut'], foes: [foe('wisp', { hp: 200 })] }), 'f');
    arrange(s, ['sun', 'sun', 'cut']);
    const f = s.foes[0]!;
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun'), target: f.id });
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun'), target: f.id });
    expect(f.broken).toBe(true);
    const ev = submitAction(s, { type: 'end' });
    expect(ev.some((e) => e.t === 'skip')).toBe(true);
    expect(ev.some((e) => e.t === 'heroHit')).toBe(false);
    expect(f.broken).toBe(false);
    expect(f.hardened).toBe(true);
    expect(f.shell).toBe(2);
    arrange(s, ['sun', 'sun', 'cut']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun'), target: f.id });
    expect(f.shell).toBe(2);
    submitAction(s, { type: 'end' });
    expect(f.hardened).toBe(false);
  });

  test('Crack chips Shell without a weakness', () => {
    const { state: s } = createBattle(setupWith({ deck: ['pry', 'cut', 'cut'], foes: [foe('wisp', { weaknesses: [] })] }), 'g');
    arrange(s, ['pry', 'cut', 'cut']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'pry'), target: s.foes[0]!.id });
    expect(s.foes[0]!.broken).toBe(true);
  });
});

describe('Chain', () => {
  test('each card of the same affinity in a row adds 20%; a different affinity starts over', () => {
    const { state: s } = createBattle(setupWith({ deck: ['sun', 'sun', 'moon', 'cut'], foes: [neutralFoe()] }), 'h');
    arrange(s, ['sun', 'sun', 'moon']);
    const f = s.foes[0]!;
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun') });
    expect(f.hp).toBe(95);
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun') });
    expect(f.hp).toBe(89);
    submitAction(s, { type: 'play', uid: uidOf(s, 'moon') });
    expect(f.hp).toBe(84);
    expect(s.stats.chains).toBe(1);
    expect(s.stats.maxChain).toBe(2);
  });

  test('a Linked card continues any Chain', () => {
    const { state: s } = createBattle(setupWith({ deck: ['sun', 'link', 'sun', 'cut'], foes: [neutralFoe()] }), 'i');
    arrange(s, ['sun', 'link', 'sun']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun') });
    submitAction(s, { type: 'play', uid: uidOf(s, 'link') });
    submitAction(s, { type: 'play', uid: uidOf(s, 'sun') });
    // 5, then 5 × 1.2 = 6, then 5 × 1.4 = 7.
    expect(s.foes[0]!.hp).toBe(82);
    expect(s.stats.maxChain).toBe(3);
  });
});

describe('statuses', () => {
  test('Burn ticks at the start of the foe turn and falls by one', () => {
    const { state: s } = createBattle(setupWith({ deck: ['ember', 'brace', 'brace', 'brace'], foes: [neutralFoe({ hp: 30 })] }), 'j');
    arrange(s, ['ember', 'brace', 'brace']);
    submitAction(s, { type: 'play', uid: uidOf(s, 'ember') });
    expect(s.foes[0]!.statuses.burn).toBe(3);
    submitAction(s, { type: 'end' });
    expect(s.foes[0]!.hp).toBe(25);
    expect(s.foes[0]!.statuses.burn).toBe(2);
  });

  test('Chill softens a foe; Hex and Shock make it take more', () => {
    const { state: s } = createBattle(setupWith({ deck: ['frost', 'hex', 'shock', 'cut', 'cut', 'cut'], foes: [neutralFoe({ moves: [{ id: 'maul', name: 'Maul', dmg: 12 }] })] }), 'k');
    arrange(s, ['frost', 'hex', 'shock']);
    const f = s.foes[0]!;
    submitAction(s, { type: 'play', uid: uidOf(s, 'frost') });
    submitAction(s, { type: 'play', uid: uidOf(s, 'hex') });
    submitAction(s, { type: 'play', uid: uidOf(s, 'shock') });
    expect(incoming(s).damage).toBe(9);
    submitAction(s, { type: 'end' });
    expect(s.hero.hp).toBe(51);
    arrange(s, ['cut', 'cut', 'cut']);
    const before = f.hp;
    submitAction(s, { type: 'play', uid: uidOf(s, 'cut') });
    // 6 × 1.25 (Hex) = 7.5, rounded to 8, plus 5 Shock.
    expect(before - f.hp).toBe(13);
    expect(f.statuses.shock).toBeUndefined();
  });
});

describe('ultimates', () => {
  test('a full gauge conjures the ultimate into hand, past the hand limit', () => {
    const { state: s } = createBattle(
      setupWith({ deck: ['cut', 'cut', 'cut', 'cut'], foes: [neutralFoe()], hero: { ultimate: 'ult', passives: [{ type: 'startGauge', value: 95 }] } }),
      'l',
    );
    submitAction(s, { type: 'play', uid: s.hand[0]!.uid });
    expect(s.hand.map((c) => c.id)).toContain('ult');
    expect(s.hero.gauge).toBe(0);
    submitAction(s, { type: 'play', uid: uidOf(s, 'ult') });
    expect(s.spent.map((c) => c.id)).toEqual(['ult']);
    expect(s.stats.ultimates).toBe(1);
  });
});

describe('foe moves', () => {
  test('Shatter breaks the ward of the best held card', () => {
    const { state: s } = createBattle(
      setupWith({ deck: ['brace', 'brace', 'cut', 'cut'], foes: [neutralFoe({ moves: [{ id: 'rend', name: 'Rend', dmg: 10, shatter: true }] })] }),
      'm',
    );
    arrange(s, ['brace', 'brace', 'cut']);
    submitAction(s, { type: 'end' });
    // Held 13 ward; Rend breaks a Brace's 6 first, so 7 ward meets 10 damage.
    expect(s.hero.hp).toBe(57);
  });

  test('curses add Ash, summons add foes, and the late hour enrages', () => {
    const { state: s } = createBattle(
      setupWith({
        deck: ['brace', 'brace', 'brace', 'brace'],
        hero: { maxHp: 999, hp: 999 },
        foes: [
          neutralFoe({
            moves: [
              { id: 'hymn', name: 'Hymn', curse: 2 },
              { id: 'call', name: 'Call', summon: 'wisp' },
            ],
            pattern: ['hymn', 'call', 'hymn'],
          }),
        ],
        summons: { wisp: foe('wisp') },
      }),
      'n',
    );
    submitAction(s, { type: 'end' });
    expect(allCards(s).filter((c) => c.id === 'ash')).toHaveLength(2);
    submitAction(s, { type: 'end' });
    expect(s.foes).toHaveLength(2);
    expect(s.foes[1]!.intent).toBe('bite');
    while (s.turn < LATE_TURN) submitAction(s, { type: 'end' });
    submitAction(s, { type: 'end' });
    expect(s.foes[0]!.statuses.rage).toBeGreaterThan(0);
  });
});

describe('the auto-player', () => {
  const easy = () =>
    setupWith({
      deck: ['cut', 'cut', 'cut', 'sun', 'sun', 'brace', 'brace', 'brace'],
      foes: [foe('wisp', { hp: 24 }), foe('hound', { hp: 28, weaknesses: ['moon'], moves: [{ id: 'snap', name: 'Snap', dmg: 3, hits: 2 }] })],
    });

  test('wins an easy fight', () => {
    const { state } = createBattle(easy(), 'o');
    autoPlay(state);
    expect(state.result).toBe('victory');
    expect(state.hero.hp).toBeGreaterThan(30);
  });

  test('is deterministic: the same seed and choices give the same fight', () => {
    const a = autoPlay(createBattle(easy(), 'p').state);
    const b = autoPlay(createBattle(easy(), 'p').state);
    expect(JSON.stringify({ ...a, cards: null })).toBe(JSON.stringify({ ...b, cards: null }));
  });

  test('never loses or invents a card across many seeds', () => {
    for (let i = 0; i < 60; i++) {
      const setup = easy();
      const b = CardBattle.create(setup, `q${i}`);
      let guard = 0;
      while (!b.over && guard++ < 300) {
        const a = chooseCardAction(b.state)!;
        b.submit(a);
        const cards = allCards(b.state).filter((c) => c.id !== 'ash' && c.id !== 'ult');
        expect(cards).toHaveLength(setup.deck.length);
        expect(b.state.hero.hp).toBeGreaterThanOrEqual(0);
        expect(b.state.hero.hp).toBeLessThanOrEqual(b.state.hero.maxHp);
        for (const f of b.state.foes) expect(f.shell).toBeGreaterThanOrEqual(0);
      }
      expect(b.over).toBe(true);
    }
  });

  test('look-ahead copies share the card table and leave the original alone', () => {
    const { state } = createBattle(easy(), 'r');
    const copy = cloneState(state);
    expect(copy.cards).toBe(state.cards);
    submitAction(copy, { type: 'end' });
    expect(state.turn).toBe(1);
  });
});

describe('Echoes', () => {
  test('come from how you played, and the same run always makes the same Echo', () => {
    const style = newStyle();
    addToStyle(style, {
      turns: 5,
      cardsPlayed: 12,
      damageDealt: 80,
      damageTaken: 6,
      blocked: 10,
      heldWard: 40,
      held: 10,
      breaks: 1,
      kos: 2,
      maxChain: 2,
      chains: 1,
      ultimates: 0,
      healed: 0,
      plays: { flame: 9, none: 3 },
      kinds: { strike: 4, guard: 6, balanced: 2 },
    });
    const a = generateEcho(style, { seed: 'run', index: 0, heroAffinity: 'sun', stratum: 0 });
    const b = generateEcho(style, { seed: 'run', index: 0, heroAffinity: 'sun', stratum: 0 });
    const c = generateEcho(style, { seed: 'run', index: 1, heroAffinity: 'sun', stratum: 0 });
    expect(a).toEqual(b);
    expect(c.id).not.toBe(a.id);
    expect(a.source).toBe('echo');
    expect(a.atk + a.ward).toBeGreaterThan(4);
    expect(cardText(a).length).toBeGreaterThan(0);
  });

  test('lean toward the affinity you play most', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const style = newStyle();
      style.battles = 3;
      style.cardsPlayed = 30;
      style.plays = { frost: 25, none: 5 };
      style.kinds = { strike: 15, balanced: 15 };
      const e = generateEcho(style, { seed: `s${i}`, index: 0, heroAffinity: 'sun', stratum: 1 });
      counts[e.affinity ?? 'none'] = (counts[e.affinity ?? 'none'] ?? 0) + 1;
    }
    expect(counts['frost']! / 200).toBeGreaterThan(0.75);
  });

  test('every test card has rules text', () => {
    for (const c of Object.values(CARDS)) if (c.kind !== 'curse') expect(cardText(c)).not.toBe('');
  });
});
