import { signal } from '@preact/signals';
import { Battle, choosePartyAction, type Action, type BattleEvent, type BattleSetup } from '@duskline/core';
import { sfx } from '../game/sfx';
import type { BattleScene } from './scene';
import { applyEvent, snapshot, type BattleView } from './view';

/** What the player has started but not finished: an action waiting for its target. */
export type Pending =
  | { kind: 'skill'; skill: 'basic' | 'skill' }
  | { kind: 'ultimate'; unit: string };

export interface Cutin {
  kind: 'ult' | 'burst';
  title: string;
  unit: string | null;
}

/**
 * Runs one battle for the screen. The engine settles a whole action instantly; this plays the
 * resulting events back in order (through the scene and the view) so the player can follow along.
 */
export class BattleController {
  readonly battle: Battle;
  readonly view = signal<BattleView>(null as unknown as BattleView);
  readonly busy = signal(true);
  readonly pending = signal<Pending | null>(null);
  readonly callout = signal<{ text: string; tone: 'gold' | 'rose' | 'teal' | 'plain' } | null>(null);
  readonly cutin = signal<Cutin | null>(null);
  readonly auto = signal(false);
  readonly speed = signal(1);
  readonly ended = signal(false);
  scene: BattleScene | null = null;
  private disposed = false;
  private calloutId = 0;

  constructor(setup: BattleSetup, seed: string) {
    this.battle = Battle.create(setup, seed);
    this.view.value = snapshot(this.battle);
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
    this.pending.value = null;
    if (this.auto.value) void this.autoStep();
  }

  private sleep(ms: number): Promise<void> {
    return this.scene ? this.scene.wait(ms) : new Promise((r) => setTimeout(r, ms / this.speed.value));
  }

  private say(text: string, tone: 'gold' | 'rose' | 'teal' | 'plain' = 'plain', ms = 700): void {
    const id = ++this.calloutId;
    this.callout.value = { text, tone };
    void this.sleep(ms).then(() => {
      if (this.calloutId === id) this.callout.value = null;
    });
  }

  /** Play the opening events (first enemy intents), then hand over. */
  async start(): Promise<void> {
    this.busy.value = true;
    const v = snapshot(this.battle);
    // Show the opening state straight away; intents are already in the view.
    this.view.value = v;
    this.scene?.sync(v.units);
    await this.sleep(350);
    this.settle();
    if (this.auto.value) void this.autoStep();
  }

  private settle(): void {
    if (this.disposed) return;
    const v = snapshot(this.battle);
    this.view.value = v;
    this.scene?.sync(v.units);
    this.scene?.setActive(v.awaiting?.actor ?? null);
    this.scene?.setTargets([]);
    this.busy.value = false;
    if (v.result && !this.ended.value) {
      this.ended.value = true;
      this.auto.value = false;
      if (v.result === 'victory') sfx.win();
      else sfx.lose();
    }
  }

  /** Legal actions grouped for the action bar. */
  targetsFor(p: Pending): string[] {
    const acts = this.battle.legalActions();
    const out: string[] = [];
    for (const a of acts) {
      if (p.kind === 'skill' && a.type === 'skill' && a.skill === p.skill && a.target) out.push(a.target);
      if (p.kind === 'ultimate' && a.type === 'ultimate' && a.unit === p.unit && a.target) out.push(a.target);
    }
    return out;
  }

  /** Does the chosen action need a target step? Returns the action to run when it does not. */
  begin(p: Pending): void {
    if (this.busy.value || this.ended.value) return;
    const targets = this.targetsFor(p);
    if (targets.length === 0) {
      void this.submit(p.kind === 'skill' ? { type: 'skill', skill: p.skill } : { type: 'ultimate', unit: p.unit });
      return;
    }
    if (targets.length === 1) {
      const target = targets[0]!;
      void this.submit(p.kind === 'skill' ? { type: 'skill', skill: p.skill, target } : { type: 'ultimate', unit: p.unit, target });
      return;
    }
    this.pending.value = p;
    this.scene?.setTargets(targets);
    this.preview(null);
  }

  choose(target: string): void {
    const p = this.pending.value;
    if (!p || this.busy.value) return;
    this.pending.value = null;
    void this.submit(p.kind === 'skill' ? { type: 'skill', skill: p.skill, target } : { type: 'ultimate', unit: p.unit, target });
  }

  cancel(): void {
    this.pending.value = null;
    this.scene?.setTargets([]);
    this.preview(null);
  }

  /** Show how an action would reorder the turn bar. */
  preview(action: Action | null): void {
    this.view.value = snapshot(this.battle, action);
  }

  async submit(action: Action): Promise<void> {
    if (this.busy.value || this.ended.value || this.disposed) return;
    this.busy.value = true;
    this.pending.value = null;
    this.scene?.setTargets([]);
    this.scene?.setActive(null);
    const events = this.battle.submit(action);
    await this.play(events);
    this.settle();
    if (this.auto.value && !this.ended.value) void this.autoStep();
  }

  private async autoStep(): Promise<void> {
    await this.sleep(420);
    if (this.disposed || !this.auto.value || this.busy.value || this.ended.value) return;
    const a = choosePartyAction(this.battle.state);
    if (a) await this.submit(a);
  }

  private async play(events: BattleEvent[]): Promise<void> {
    const work: BattleView = structuredClone(this.view.value);
    const sc = this.scene;
    let lastActor = '';
    for (const e of events) {
      if (this.disposed) return;
      switch (e.t) {
        case 'act': {
          lastActor = e.actor;
          const name = work.units.find((u) => u.id === e.actor);
          if (e.kind === 'guard') {
            sfx.tap();
            void sc?.cast(e.actor);
            this.say('GUARD', 'teal', 500);
          } else {
            if (name?.side === 'foe' || e.kind !== 'basic') this.say(e.name, name?.side === 'foe' ? 'rose' : 'gold', 800);
            const offensive = e.targets.length > 0 && work.units.find((u) => u.id === e.targets[0])?.side !== name?.side;
            if (offensive) await sc?.lunge(e.actor, e.targets[0]);
            else await sc?.cast(e.actor);
          }
          break;
        }
        case 'hit': {
          const kind = e.crit ? 'crit' : e.weak ? 'weak' : e.resist ? 'resist' : 'normal';
          applyEvent(work, e);
          this.view.value = structuredClone(work);
          if (kind === 'weak') sfx.weak();
          else if (kind === 'crit') sfx.crit();
          else sfx.hit();
          await sc?.hit(e.target, e.amount, kind);
          break;
        }
        case 'heal':
          applyEvent(work, e);
          this.view.value = structuredClone(work);
          sfx.heal();
          sc?.heal(e.target, e.amount);
          await this.sleep(260);
          break;
        case 'break':
          applyEvent(work, e);
          this.view.value = structuredClone(work);
          sfx.break();
          sc?.breakBurst(e.unit);
          sc?.sync(work.units);
          this.say('BREAK', 'gold', 900);
          await this.sleep(420);
          break;
        case 'ko':
          applyEvent(work, e);
          this.view.value = structuredClone(work);
          sfx.ko();
          await sc?.ko(e.unit);
          break;
        case 'recover':
          applyEvent(work, e);
          this.view.value = structuredClone(work);
          sc?.sync(work.units);
          this.say('RECOVERED', 'plain', 600);
          break;
        case 'skip':
          this.say('STUNNED', 'plain', 700);
          await this.sleep(500);
          break;
        case 'encore':
          sfx.encore();
          this.say('ENCORE!', 'gold', 800);
          await this.sleep(350);
          break;
        case 'pass':
          sfx.pass();
          this.say(e.count > 1 ? `PASS ×${e.count}` : 'PASS', 'teal', 700);
          await this.sleep(300);
          break;
        case 'ult': {
          sfx.ult();
          this.cutin.value = { kind: 'ult', title: e.name, unit: lastActor || null };
          await this.sleep(850);
          this.cutin.value = null;
          void sc?.flashScreen(0xf2b43a);
          break;
        }
        case 'burst':
          sfx.burst();
          this.cutin.value = { kind: 'burst', title: 'Horizon Burst', unit: null };
          await this.sleep(1000);
          this.cutin.value = null;
          void sc?.flashScreen(0xe0457b);
          break;
        case 'delay':
        case 'advance':
          break;
        default:
          applyEvent(work, e);
          this.view.value = structuredClone(work);
      }
    }
  }
}
