import { signal } from '@preact/signals';
import {
  CardBattle,
  cardStats,
  chooseCardAction,
  defOf,
  hitAmount,
  living,
  passiveSum,
  playable,
  type BattleSetup,
  type CardAction,
  type CardBattleState,
  type CardEvent,
  type Mood,
} from '@duskline/core';
import { sfx } from '../game/sfx';
import type { BattleScene } from './scene';
import { applyEvent, snapshot, type BattleView } from './view';

export interface Callout {
  id: number;
  text: string;
  tone: 'gold' | 'blood' | 'bone' | 'teal';
}

export interface Float {
  id: number;
  text: string;
  kind: 'hurt' | 'heal' | 'ward';
}

/**
 * Runs one card battle for the screen. The engine settles an action instantly; this plays the
 * resulting events back in order through the scene and the view, so the player can follow them.
 */
export class CardController {
  readonly battle: CardBattle;
  readonly view = signal<BattleView>(null as unknown as BattleView);
  readonly busy = signal(true);
  readonly selected = signal<number | null>(null);
  readonly callout = signal<Callout | null>(null);
  readonly cutin = signal<{ title: string; hero: string } | null>(null);
  readonly floats = signal<Float[]>([]);
  readonly flying = signal<number | null>(null);
  readonly hurt = signal(0);
  /** The hero's face in the portrait: reacts to hits, Breaks, heals and the end of the fight. */
  readonly face = signal<Mood>('calm');
  readonly auto = signal(false);
  readonly speed = signal(1);
  readonly ended = signal(false);
  scene: BattleScene | null = null;
  private disposed = false;
  private seq = 0;
  private faceSeq = 0;
  private lateShown = false;

  constructor(setup: BattleSetup, seed: string) {
    this.battle = CardBattle.create(setup, seed);
    this.view.value = snapshot(this.battle.state);
  }

  get state(): CardBattleState {
    return this.battle.state;
  }

  dispose(): void {
    this.disposed = true;
  }

  attach(scene: BattleScene): void {
    this.scene = scene;
    scene.speed = this.speed.value;
  }

  setSpeed(s: number): void {
    this.speed.value = s;
    if (this.scene) this.scene.speed = s;
  }

  toggleAuto(): void {
    this.auto.value = !this.auto.value;
    this.clearSelection();
    if (this.auto.value && !this.busy.value) void this.autoStep();
  }

  private sleep(ms: number): Promise<void> {
    return this.scene ? this.scene.wait(ms) : new Promise((r) => setTimeout(r, ms / this.speed.value));
  }

  private say(text: string, tone: Callout['tone'] = 'bone', ms = 750): void {
    const id = ++this.seq;
    this.callout.value = { id, text, tone };
    void this.sleep(ms).then(() => {
      if (this.callout.value?.id === id) this.callout.value = null;
    });
  }

  /** The face to rest on: strained when HP is low. */
  private baseFace(): Mood {
    const h = this.state.hero;
    return h.hp / h.maxHp < 0.3 ? 'hurt' : 'calm';
  }

  /** Show a feeling for a moment, then settle back. */
  private react(mood: Mood, ms: number): void {
    const id = ++this.faceSeq;
    this.face.value = mood;
    void this.sleep(ms).then(() => {
      if (this.faceSeq === id && !this.ended.value) this.face.value = this.baseFace();
    });
  }

  private float(text: string, kind: Float['kind']): void {
    const id = ++this.seq;
    this.floats.value = [...this.floats.value, { id, text, kind }];
    setTimeout(() => (this.floats.value = this.floats.value.filter((f) => f.id !== id)), 900);
  }

  async start(): Promise<void> {
    this.busy.value = true;
    await this.sleep(300);
    this.settle();
  }

  private settle(): void {
    if (this.disposed) return;
    const v = snapshot(this.state);
    this.view.value = v;
    this.scene?.sync(v.foes);
    this.scene?.setActive(null);
    this.scene?.setTargets([]);
    this.busy.value = false;
    if (v.result && !this.ended.value) {
      this.ended.value = true;
      this.auto.value = false;
      this.faceSeq++;
      this.face.value = v.result === 'victory' ? 'smile' : 'hurt';
      if (v.result === 'victory') sfx.win();
      else sfx.lose();
      return;
    }
    if (this.face.value === 'calm' || this.face.value === 'hurt') this.face.value = this.baseFace();
    if (this.auto.value) void this.autoStep();
  }

  // ---- input -----------------------------------------------------------------

  canAct(): boolean {
    return !this.busy.value && !this.ended.value && !this.auto.value && !this.state.over;
  }

  needsTarget(uid: number): boolean {
    const c = this.state.hand.find((x) => x.uid === uid);
    if (!c) return false;
    return defOf(this.state, c).target === 'foe' && living(this.state).length > 1;
  }

  /** Why a card cannot be played now, or null if it can. */
  blocked(uid: number): string | null {
    const c = this.state.hand.find((x) => x.uid === uid);
    if (!c) return 'Gone';
    const st = cardStats(defOf(this.state, c), c.up);
    if (st.keywords.includes('unplayable')) return 'Ash cannot be played. It is thrown away at the end of the turn.';
    if (!playable(this.state, c)) return `Needs ${st.cost} Light. You have ${this.state.light}.`;
    return null;
  }

  clearSelection(): void {
    this.selected.value = null;
    this.scene?.setTargets([]);
  }

  /** First tap picks a card up, the second plays it. With several foes, tap a foe instead. */
  tapCard(uid: number): void {
    if (!this.canAct()) return;
    const why = this.blocked(uid);
    if (why) {
      this.say(why.startsWith('Needs') ? 'Not enough Light' : 'Cannot be played', 'bone', 900);
      return;
    }
    sfx.tap();
    if (this.selected.value === uid) {
      if (this.needsTarget(uid)) this.say('Choose a foe', 'bone', 700);
      else void this.play(uid);
      return;
    }
    this.selected.value = uid;
    this.scene?.setTargets(this.needsTarget(uid) ? living(this.state).map((f) => f.id) : []);
  }

  tapFoe(id: string): void {
    const uid = this.selected.value;
    if (uid === null || !this.canAct()) return;
    void this.play(uid, id);
  }

  /** Damage the selected card would do to a foe, per hit, for the preview on its plate. */
  previewOn(foeId: string): { amount: number; hits: number; weak: boolean; resist: boolean } | null {
    const uid = this.selected.value;
    const c = uid === null ? undefined : this.state.hand.find((x) => x.uid === uid);
    const f = this.state.foes.find((x) => x.id === foeId);
    if (!c || !f || !f.alive) return null;
    const def = defOf(this.state, c);
    const st = cardStats(def, c.up);
    if (st.atk <= 0 || def.target === 'self') return null;
    const first = this.state.playedThisTurn === 0 ? passiveSum(this.state.hero.passives, 'firstStrike') : 0;
    const chained = def.affinity !== null && def.affinity === this.state.chain.affinity;
    const sim = { ...this.state, chain: { ...this.state.chain, steps: chained || st.keywords.includes('linked') ? this.state.chain.steps + 1 : 0 } };
    const r = hitAmount(sim, f, def, st.atk + first);
    return { amount: r.amount, hits: st.hits, weak: r.weak, resist: r.resist };
  }

  async play(uid: number, target?: string): Promise<void> {
    if (!this.canAct()) return;
    const a: CardAction = target ? { type: 'play', uid, target } : { type: 'play', uid };
    await this.submit(a);
  }

  async endTurn(): Promise<void> {
    if (!this.canAct()) return;
    await this.submit({ type: 'end' });
  }

  private async submit(a: CardAction): Promise<void> {
    if (this.state.over || this.disposed) return;
    this.busy.value = true;
    this.clearSelection();
    let events: CardEvent[];
    try {
      events = this.battle.submit(a);
    } catch {
      this.busy.value = false;
      return;
    }
    await this.playback(events);
    this.settle();
  }

  private async autoStep(): Promise<void> {
    await this.sleep(380);
    if (this.disposed || !this.auto.value || this.busy.value || this.ended.value) return;
    const a = chooseCardAction(this.state);
    if (a) await this.submit(a);
  }

  // ---- playback --------------------------------------------------------------

  private async playback(events: CardEvent[]): Promise<void> {
    const work: BattleView = structuredClone(this.view.value);
    const sc = this.scene;
    const push = (): void => {
      this.view.value = structuredClone(work);
    };
    for (const e of events) {
      if (this.disposed) return;
      switch (e.t) {
        case 'play':
          this.flying.value = e.uid;
          sfx.card();
          await this.sleep(170);
          this.flying.value = null;
          applyEvent(work, e, this.state);
          push();
          break;
        case 'chain':
          applyEvent(work, e, this.state);
          push();
          this.say(`Chain ×${e.steps + 1}`, 'gold', 700);
          if (e.steps >= 1) this.react('smile', 700);
          break;
        case 'hit': {
          applyEvent(work, e, this.state);
          push();
          sc?.slash(e.target);
          if (e.weak) sfx.weak();
          else sfx.hit();
          const dealt = e.amount - e.blocked;
          await sc?.hit(e.target, dealt, e.weak ? 'weak' : e.resist ? 'resist' : 'normal');
          break;
        }
        case 'crack':
          applyEvent(work, e, this.state);
          push();
          sfx.tap();
          await this.sleep(120);
          break;
        case 'break':
          applyEvent(work, e, this.state);
          push();
          sfx.break();
          sc?.breakBurst(e.unit);
          this.say('BREAK', 'gold', 900);
          this.react('fierce', 1100);
          await this.sleep(380);
          break;
        case 'ko':
          applyEvent(work, e, this.state);
          push();
          sfx.ko();
          this.react('smile', 800);
          await sc?.ko(e.unit);
          break;
        case 'heal':
          applyEvent(work, e, this.state);
          push();
          if (e.amount > 0) {
            sfx.heal();
            if (e.unit === 'hero') {
              this.float(`+${e.amount}`, 'heal');
              this.react('smile', 700);
            }
            else sc?.heal(e.unit, e.amount);
          }
          break;
        case 'held':
          sfx.ward();
          if (e.ward > 0) this.float(`+${e.ward} ward`, 'ward');
          await this.sleep(240);
          break;
        case 'ultimate': {
          applyEvent(work, e, this.state);
          push();
          sfx.ult();
          this.react('fierce', 1400);
          this.cutin.value = { title: defOf(this.state, { uid: e.uid, id: e.id }).name, hero: this.state.hero.id };
          await this.sleep(900);
          this.cutin.value = null;
          void sc?.flash(0xd9a441, 0.35);
          break;
        }
        case 'foeTurn':
          sc?.setActive(e.unit);
          await this.sleep(110);
          break;
        case 'move': {
          applyEvent(work, e, this.state);
          push();
          this.say(e.name, 'blood', 800);
          const f = work.foes.find((x) => x.id === e.unit);
          if (f?.intent?.parts.includes('attack')) await sc?.strike(e.unit);
          else {
            sfx.bell();
            await sc?.gesture(e.unit);
          }
          break;
        }
        case 'heroHit': {
          applyEvent(work, e, this.state);
          push();
          const taken = e.amount - e.blocked;
          if (taken > 0) {
            sfx.hit();
            this.hurt.value++;
            this.react(taken >= this.state.hero.maxHp * 0.15 ? 'shock' : 'hurt', 900);
            this.float(`−${taken}`, 'hurt');
            void sc?.flash(0xc8322c, 0.22);
            sc?.shake(0.8);
          } else {
            sfx.ward();
            this.float('Warded', 'ward');
          }
          await this.sleep(200);
          break;
        }
        case 'burn':
          applyEvent(work, e, this.state);
          push();
          await this.sleep(160);
          break;
        case 'skip':
          this.say('STUNNED', 'bone', 700);
          await this.sleep(420);
          break;
        case 'shatter':
          applyEvent(work, e, this.state);
          push();
          sfx.break();
          this.say('WARD BROKEN', 'blood', 800);
          await this.sleep(300);
          break;
        case 'curse':
          applyEvent(work, e, this.state);
          push();
          this.say(`${e.count} Ash in your discard pile`, 'bone', 900);
          break;
        case 'summon':
          applyEvent(work, e, this.state);
          push();
          await sc?.load(work.foes);
          await this.sleep(250);
          break;
        case 'late':
          if (!this.lateShown) {
            this.lateShown = true;
            this.say('The hour grows late', 'blood', 1200);
            await this.sleep(500);
          }
          break;
        case 'turn':
          applyEvent(work, e, this.state);
          push();
          await this.sleep(120);
          break;
        default:
          applyEvent(work, e, this.state);
          push();
      }
    }
  }
}
