import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { requireEnemy, requireHero } from '@duskline/content';
import { enemySvg } from '../art/enemy';
import { figureSvg } from '../art/figure';
import { svgTexture } from '../art/textures';
import { spotFor } from './layout';
import type { UnitView } from './view';

/**
 * The battle stage. A transparent PixiJS canvas over the CSS sky: foes stand against the sunset,
 * the party stands on dark ground below. It only draws and animates; the controller decides what happens.
 */

interface Tween {
  t: number;
  dur: number;
  step: (p: number) => void;
  done: () => void;
}

interface Actor {
  id: string;
  side: 'party' | 'foe';
  box: Container;
  sprite: Sprite;
  homeX: number;
  homeY: number;
  baseScale: number;
  flash: number;
  offX: number;
  offY: number;
  pop: number;
  bobPhase: number;
  state: { broken: boolean; alive: boolean };
  fade: number;
  meta: { slot: number; count: number; tier: string };
}

export type HitKind = 'normal' | 'weak' | 'crit' | 'resist' | 'heal' | 'miss';

const ease = (p: number): number => 1 - (1 - p) * (1 - p);
const FONT = "'Dela Gothic One', 'Arial Black', Impact, sans-serif";

export class BattleScene {
  private app: Application | null = null;
  private world = new Container();
  private fx = new Container();
  private ring = new Graphics();
  private actors = new Map<string, Actor>();
  private tweens: Tween[] = [];
  private shakeT = 0;
  private time = 0;
  private activeId: string | null = null;
  private targetIds = new Set<string>();
  private destroyed = false;
  speed = 1;
  reduced = false;

  constructor(private host: HTMLElement) {}

  async init(): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    this.host.appendChild(app.canvas);
    app.canvas.style.display = 'block';
    this.world.addChild(this.ring);
    app.stage.addChild(this.world, this.fx);
    app.ticker.add((tk) => this.tick(tk.deltaMS));
    app.renderer.on('resize', () => this.layoutAll());
  }

  get width(): number {
    return this.app?.screen.width ?? 1;
  }
  get height(): number {
    return this.app?.screen.height ?? 1;
  }

  async load(units: UnitView[]): Promise<void> {
    const app = this.app;
    if (!app) return;
    const party = units.filter((u) => u.side === 'party');
    const foes = units.filter((u) => u.side === 'foe');
    const textures = await Promise.all(
      units.map((u): Promise<Texture> => {
        if (u.side === 'party') {
          const h = requireHero(u.defId);
          return svgTexture(`fig:${h.id}`, figureSvg(h.look, { crop: 'full' }), 200, 340);
        }
        const e = requireEnemy(u.defId);
        return svgTexture(`foe:${e.family}`, enemySvg(e.family), 240, 280);
      }),
    );
    if (this.destroyed) return;
    units.forEach((u, i) => {
      const tex = textures[i]!;
      const box = new Container();
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1);
      box.addChild(sprite);
      this.world.addChild(box);
      const count = u.side === 'party' ? party.length : foes.length;
      const a: Actor = {
        id: u.id,
        side: u.side,
        box,
        sprite,
        homeX: 0,
        homeY: 0,
        baseScale: 1,
        flash: 0,
        offX: 0,
        offY: 0,
        pop: 0,
        bobPhase: Math.random() * 6.28,
        state: { broken: u.broken, alive: u.alive },
        fade: u.alive ? 1 : 0,
        meta: { slot: u.slot, count, tier: u.tier },
      };
      this.actors.set(u.id, a);
    });
    this.layoutAll();
  }

  private layoutAll(): void {
    const W = this.width;
    const H = this.height;
    for (const a of this.actors.values()) {
      const m = a.meta;
      const spot = spotFor(a.side, m.slot, m.count, m.tier);
      const tex = a.sprite.texture;
      const targetH = Math.min(spot.h * H, (spot.col * W * 0.98 * tex.height) / tex.width);
      a.baseScale = targetH / tex.height;
      a.homeX = spot.x * W;
      a.homeY = spot.y * H;
      a.sprite.scale.set(a.baseScale);
    }
  }

  /** Steady-state look: broken foes slump, fallen heroes fade. */
  sync(units: UnitView[]): void {
    for (const u of units) {
      const a = this.actors.get(u.id);
      if (!a) continue;
      a.state.broken = u.broken;
      a.state.alive = u.alive;
      if (u.alive) a.fade = 1;
    }
  }

  setActive(id: string | null): void {
    this.activeId = id;
  }

  setTargets(ids: string[]): void {
    this.targetIds = new Set(ids);
  }

  // ---- animation primitives -------------------------------------------------

  private dur(ms: number): number {
    return (this.reduced ? Math.min(ms, 90) : ms) / this.speed;
  }

  private tween(ms: number, step: (p: number) => void): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ t: 0, dur: this.dur(ms), step, done: resolve });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => {});
  }

  /** Step toward the target, strike, and come home. Resolves at the moment of impact. */
  async lunge(actorId: string, targetId: string | undefined): Promise<void> {
    const a = this.actors.get(actorId);
    if (!a) return;
    const t = targetId ? this.actors.get(targetId) : undefined;
    const dx = t ? (t.homeX - a.homeX) * 0.55 : 0;
    const dy = t ? (t.homeY - a.homeY) * 0.55 : a.side === 'party' ? -this.height * 0.03 : this.height * 0.03;
    if (this.reduced) {
      await this.wait(90);
      return;
    }
    await this.tween(170, (p) => {
      a.offX = dx * ease(p);
      a.offY = dy * ease(p);
    });
    void this.tween(240, (p) => {
      a.offX = dx * (1 - ease(p));
      a.offY = dy * (1 - ease(p));
    });
  }

  /** Small hop for buffs, guards and other non-attacks. */
  async cast(actorId: string): Promise<void> {
    const a = this.actors.get(actorId);
    if (!a) return;
    await this.tween(320, (p) => {
      a.offY = -Math.sin(p * Math.PI) * this.height * 0.03;
      a.pop = Math.sin(p * Math.PI) * 0.06;
    });
  }

  async hit(targetId: string, amount: number, kind: HitKind): Promise<void> {
    const a = this.actors.get(targetId);
    if (!a) return;
    const big = kind === 'weak' || kind === 'crit';
    a.flash = 1;
    a.pop = big ? 0.14 : 0.07;
    this.number(a, kind === 'miss' ? 'MISS' : String(amount), kind);
    if (big && !this.reduced) this.shakeT = 1;
    const dir = a.side === 'foe' ? 1 : -1;
    await this.tween(200, (p) => {
      a.offX = dir * Math.sin(p * Math.PI) * (this.reduced ? 0 : 10);
    });
  }

  heal(targetId: string, amount: number): void {
    const a = this.actors.get(targetId);
    if (!a) return;
    this.number(a, `+${amount}`, 'heal');
    a.pop = 0.05;
  }

  private number(a: Actor, text: string, kind: HitKind): void {
    const colours: Record<HitKind, string> = {
      normal: '#ffffff',
      weak: '#ffd25a',
      crit: '#ff9ab8',
      resist: '#a9a4c8',
      heal: '#5fe8d4',
      miss: '#a9a4c8',
    };
    const size = kind === 'weak' || kind === 'crit' ? 30 : kind === 'resist' ? 18 : 24;
    const t = new Text({
      text: kind === 'weak' ? `${text}!` : text,
      style: { fontFamily: FONT, fontSize: size, fill: colours[kind], stroke: { color: '#110e26', width: 5 }, align: 'center' },
    });
    t.anchor.set(0.5, 1);
    const x = a.homeX + (Math.random() - 0.5) * 30;
    const y0 = a.homeY - a.sprite.height * 0.62;
    t.position.set(x, y0);
    this.fx.addChild(t);
    void this.tween(kind === 'heal' ? 800 : 720, (p) => {
      t.y = y0 - ease(p) * 34;
      t.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      const s = p < 0.15 ? 0.6 + (p / 0.15) * 0.5 : 1.1 - Math.min(0.1, (p - 0.15) * 0.3);
      t.scale.set(s);
    }).then(() => t.destroy());
  }

  /** Shell shatters: a spray of gold and rose shards. */
  breakBurst(targetId: string): void {
    const a = this.actors.get(targetId);
    if (!a || this.reduced) return;
    const g = new Graphics();
    const cx = a.homeX;
    const cy = a.homeY - a.sprite.height * 0.5;
    const shards = Array.from({ length: 16 }, (_, i) => ({
      ang: (i / 16) * 6.283 + Math.random() * 0.3,
      sp: 60 + Math.random() * 90,
      rot: Math.random() * 6,
      gold: i % 2 === 0,
    }));
    this.fx.addChild(g);
    this.shakeT = 1.4;
    void this.tween(620, (p) => {
      g.clear();
      for (const s of shards) {
        const d = s.sp * ease(p);
        const x = cx + Math.cos(s.ang) * d;
        const y = cy + Math.sin(s.ang) * d + p * p * 40;
        const r = 7 * (1 - p);
        g.poly([x, y - r * 1.6, x + r, y + r, x - r, y + r * 0.6])
          .fill({ color: s.gold ? 0xf2b43a : 0xe0457b, alpha: 1 - p });
      }
    }).then(() => g.destroy());
  }

  async ko(targetId: string): Promise<void> {
    const a = this.actors.get(targetId);
    if (!a) return;
    a.state.alive = false;
    await this.tween(520, (p) => {
      a.fade = 1 - ease(p);
    });
  }

  /** Full-screen light sweep for ultimates and bursts. */
  async flashScreen(color = 0xffffff): Promise<void> {
    if (this.reduced) return;
    const g = new Graphics().rect(0, 0, this.width, this.height).fill({ color });
    this.fx.addChild(g);
    await this.tween(260, (p) => {
      g.alpha = 0.5 * (1 - p);
    });
    g.destroy();
  }

  // ---- frame update ---------------------------------------------------------

  private tick(deltaMS: number): void {
    const dt = deltaMS;
    this.time += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]!;
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.step(p);
      if (p >= 1) {
        this.tweens.splice(i, 1);
        tw.done();
      }
    }
    const secs = this.time / 1000;
    for (const a of this.actors.values()) {
      a.flash = Math.max(0, a.flash - dt / 180);
      a.pop = Math.max(0, a.pop - dt / 900);
      const bob = this.reduced ? 0 : Math.sin(secs * 2 + a.bobPhase) * 2.2;
      const broken = a.state.broken && a.state.alive;
      const slump = broken ? 0.06 * this.height : 0;
      a.box.position.set(a.homeX + a.offX, a.homeY + a.offY + bob + slump);
      a.box.rotation = broken ? 0.14 : 0;
      a.box.scale.set(1 + a.pop);
      a.box.alpha = a.state.alive ? 1 : a.fade;
      const grey = broken ? 0x8a86a0 : 0xffffff;
      a.sprite.tint = a.flash > 0 ? 0xff9ec0 : grey;
    }
    // Shake
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt / 260);
      const m = this.shakeT * 5;
      this.world.position.set((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    } else this.world.position.set(0, 0);
    // Marker rings under the active hero and targetable units
    this.ring.clear();
    const pulse = 0.6 + 0.4 * Math.sin(secs * 6);
    if (this.activeId) {
      const a = this.actors.get(this.activeId);
      if (a) this.drawRing(a, 0xf2b43a, pulse, 0.5);
    }
    for (const id of this.targetIds) {
      const a = this.actors.get(id);
      if (a) this.drawRing(a, 0xe0457b, pulse, 0.62);
    }
  }

  private drawRing(a: Actor, color: number, alpha: number, wide: number): void {
    const w = a.sprite.width * wide;
    this.ring.ellipse(a.homeX, a.homeY - 2, w, w * 0.16).stroke({ color, width: 3, alpha });
  }

  destroy(): void {
    this.destroyed = true;
    for (const tw of this.tweens) tw.done();
    this.tweens = [];
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
