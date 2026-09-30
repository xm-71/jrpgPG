import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { enemySvg } from '../art/enemy';
import { BLOOD } from '../art/palette';
import { sigilSvg } from '../art/sigil';
import { svgTexture } from '../art/textures';
import { foeSpot } from './layout';
import type { FoeView } from './view';

/**
 * The battle stage: a transparent PixiJS canvas over the tower backdrop. Fades stand in a row,
 * each in front of a slowly turning sigil. The scene only draws and animates; the controller
 * decides what happens.
 */

interface Tween {
  t: number;
  dur: number;
  step: (p: number) => void;
  done: () => void;
}

interface Actor {
  id: string;
  box: Container;
  sprite: Sprite;
  halo: Sprite;
  homeX: number;
  homeY: number;
  baseScale: number;
  flash: number;
  offX: number;
  offY: number;
  pop: number;
  lean: number;
  bobPhase: number;
  broken: boolean;
  alive: boolean;
  fade: number;
  slot: number;
  tier: string;
}

export type HitKind = 'normal' | 'weak' | 'resist' | 'heal' | 'burn' | 'ward';

const ease = (p: number): number => 1 - (1 - p) * (1 - p);
const FONT = "'Shippori Mincho B1', 'Hiragino Mincho ProN', Georgia, serif";

export class BattleScene {
  private app: Application | null = null;
  private world = new Container();
  private fx = new Container();
  private rings = new Graphics();
  private actors = new Map<string, Actor>();
  private count = 1;
  private tweens: Tween[] = [];
  private shakeT = 0;
  private time = 0;
  private targetIds = new Set<string>();
  private activeId: string | null = null;
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
    this.world.addChild(this.rings);
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

  /** Make sure every foe has an actor. Safe to call again when a foe is summoned. */
  async load(foes: FoeView[]): Promise<void> {
    if (!this.app) return;
    this.count = Math.max(1, foes.length);
    const fresh = foes.filter((f) => !this.actors.has(f.id));
    const textures = await Promise.all(
      fresh.map(async (f): Promise<[Texture, Texture]> => [
        await svgTexture(`foe:${f.family}:${f.tier}`, enemySvg(f.family as never, { menace: f.tier === 'elite' || f.tier === 'boss' }), 240, 280),
        await svgTexture(`halo:${f.family}`, sigilSvg(`halo:${f.family}`, BLOOD, 200), 200, 200),
      ]),
    );
    if (this.destroyed) return;
    fresh.forEach((f, i) => {
      const [tex, haloTex] = textures[i]!;
      const box = new Container();
      const halo = new Sprite(haloTex);
      halo.anchor.set(0.5);
      halo.alpha = 0.32;
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1);
      box.addChild(halo, sprite);
      this.world.addChild(box);
      this.actors.set(f.id, {
        id: f.id,
        box,
        sprite,
        halo,
        homeX: 0,
        homeY: 0,
        baseScale: 1,
        flash: 0,
        offX: 0,
        offY: 0,
        pop: 0,
        lean: 0,
        bobPhase: i * 1.7,
        broken: f.broken,
        alive: f.alive,
        fade: 0,
        slot: f.slot,
        tier: f.tier,
      });
      void this.tween(420, (p) => {
        const a = this.actors.get(f.id);
        if (a) a.fade = ease(p);
      });
    });
    this.layoutAll();
  }

  private layoutAll(): void {
    const W = this.width;
    const H = this.height;
    for (const a of this.actors.values()) {
      const spot = foeSpot(a.slot, this.count, a.tier);
      const tex = a.sprite.texture;
      const targetH = Math.min(spot.h * H, (spot.col * W * 1.05 * tex.height) / tex.width);
      a.baseScale = targetH / tex.height;
      a.homeX = spot.x * W;
      a.homeY = spot.y * H;
      a.sprite.scale.set(a.baseScale);
      const hs = (targetH * 0.95) / a.halo.texture.height;
      a.halo.scale.set(hs);
      a.halo.position.set(0, -targetH * 0.55);
    }
  }

  /** Steady-state look: Broken foes slump, fallen ones fade. */
  sync(foes: FoeView[]): void {
    for (const f of foes) {
      const a = this.actors.get(f.id);
      if (!a) continue;
      a.broken = f.broken;
      if (f.alive && !a.alive) a.fade = 1;
      a.alive = f.alive;
    }
  }

  setTargets(ids: string[]): void {
    this.targetIds = new Set(ids);
  }

  setActive(id: string | null): void {
    this.activeId = id;
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

  /** A foe lunges at the camera. Resolves at the moment of impact. */
  async strike(foeId: string): Promise<void> {
    const a = this.actors.get(foeId);
    if (!a) return;
    if (this.reduced) {
      await this.wait(90);
      return;
    }
    await this.tween(200, (p) => {
      a.pop = 0.14 * ease(p);
      a.offY = this.height * 0.05 * ease(p);
    });
    void this.tween(260, (p) => {
      a.pop = 0.14 * (1 - ease(p));
      a.offY = this.height * 0.05 * (1 - ease(p));
    });
  }

  /** A foe that is not attacking: a slow bow. */
  async gesture(foeId: string): Promise<void> {
    const a = this.actors.get(foeId);
    if (!a) return;
    await this.tween(360, (p) => {
      a.lean = Math.sin(p * Math.PI) * 0.08;
    });
  }

  /** The hero's cut, drawn as a bone-white slash across the target. */
  slash(foeId: string, color = 0xece6d8): void {
    const a = this.actors.get(foeId);
    if (!a || this.reduced) return;
    const g = new Graphics();
    const cx = a.homeX;
    const cy = a.homeY - a.sprite.height * 0.55;
    const len = Math.max(60, a.sprite.height * 0.55);
    this.fx.addChild(g);
    void this.tween(260, (p) => {
      g.clear();
      const t = ease(Math.min(1, p * 1.6));
      g.moveTo(cx - len * 0.6, cy - len * 0.5)
        .lineTo(cx - len * 0.6 + len * 1.2 * t, cy - len * 0.5 + len * t)
        .stroke({ color, width: 5 * (1 - p) + 1, alpha: 1 - p });
    }).then(() => g.destroy());
  }

  async hit(foeId: string, amount: number, kind: HitKind): Promise<void> {
    const a = this.actors.get(foeId);
    if (!a) return;
    a.flash = 1;
    a.pop = kind === 'weak' ? 0.12 : 0.06;
    this.number(a.homeX, a.homeY - a.sprite.height * 0.62, kind === 'ward' ? `(${amount})` : String(amount), kind);
    if (kind === 'weak' && !this.reduced) this.shakeT = 1;
    await this.tween(180, (p) => {
      a.offX = Math.sin(p * Math.PI) * (this.reduced ? 0 : 9);
    });
  }

  heal(foeId: string, amount: number): void {
    const a = this.actors.get(foeId);
    if (!a) return;
    this.number(a.homeX, a.homeY - a.sprite.height * 0.62, `+${amount}`, 'heal');
  }

  /** Floating number at a point on the field. */
  number(cx: number, y0: number, text: string, kind: HitKind): void {
    const colours: Record<HitKind, string> = {
      normal: '#ece6d8',
      weak: '#ffcf6a',
      resist: '#8e8598',
      heal: '#4fc1b0',
      burn: '#ec6a3c',
      ward: '#a9b6cc',
    };
    const size = kind === 'weak' ? 34 : kind === 'resist' || kind === 'ward' ? 20 : 27;
    const t = new Text({
      text: kind === 'weak' ? `${text}!` : text,
      style: { fontFamily: FONT, fontWeight: '800', fontSize: size, fill: colours[kind], stroke: { color: '#07060b', width: 6 }, align: 'center' },
    });
    t.anchor.set(0.5, 1);
    const x = cx + (Math.random() - 0.5) * 26;
    t.position.set(x, y0);
    this.fx.addChild(t);
    void this.tween(760, (p) => {
      t.y = y0 - ease(p) * 36;
      t.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      t.scale.set(p < 0.15 ? 0.6 + (p / 0.15) * 0.5 : 1.1 - Math.min(0.1, (p - 0.15) * 0.3));
    }).then(() => t.destroy());
  }

  /** Shell shatters: a spray of gold and blood shards. */
  breakBurst(foeId: string): void {
    const a = this.actors.get(foeId);
    if (!a || this.reduced) return;
    const g = new Graphics();
    const cx = a.homeX;
    const cy = a.homeY - a.sprite.height * 0.5;
    const shards = Array.from({ length: 18 }, (_, i) => ({ ang: (i / 18) * 6.283 + Math.random() * 0.3, sp: 70 + Math.random() * 100, gold: i % 2 === 0 }));
    this.fx.addChild(g);
    this.shakeT = 1.4;
    void this.tween(640, (p) => {
      g.clear();
      for (const s of shards) {
        const d = s.sp * ease(p);
        const x = cx + Math.cos(s.ang) * d;
        const y = cy + Math.sin(s.ang) * d + p * p * 40;
        const r = 7 * (1 - p);
        g.poly([x, y - r * 1.6, x + r, y + r, x - r, y + r * 0.6]).fill({ color: s.gold ? 0xd9a441 : 0xc8322c, alpha: 1 - p });
      }
    }).then(() => g.destroy());
  }

  async ko(foeId: string): Promise<void> {
    const a = this.actors.get(foeId);
    if (!a) return;
    a.alive = false;
    await this.tween(520, (p) => {
      a.fade = 1 - ease(p);
    });
  }

  /** Full-screen light, for ultimates and hits on the hero. */
  async flash(color = 0xffffff, alpha = 0.5): Promise<void> {
    if (this.reduced) return;
    const g = new Graphics().rect(0, 0, this.width, this.height).fill({ color });
    this.fx.addChild(g);
    await this.tween(260, (p) => {
      g.alpha = alpha * (1 - p);
    });
    g.destroy();
  }

  shake(power = 1): void {
    if (!this.reduced) this.shakeT = Math.max(this.shakeT, power);
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
      const bob = this.reduced ? 0 : Math.sin(secs * 1.6 + a.bobPhase) * 3;
      const slump = a.broken && a.alive ? this.height * 0.04 : 0;
      a.box.position.set(a.homeX + a.offX, a.homeY + a.offY + bob + slump);
      a.box.rotation = (a.broken && a.alive ? 0.12 : 0) + a.lean;
      a.box.scale.set(1 + a.pop);
      a.box.alpha = a.alive ? a.fade : a.fade;
      a.sprite.tint = a.flash > 0 ? 0xff8f80 : a.broken ? 0x8e8598 : 0xffffff;
      a.halo.rotation = this.reduced ? 0 : secs * 0.12 * (a.slot % 2 === 0 ? 1 : -1);
      a.halo.alpha = a.broken ? 0.12 : this.targetIds.has(a.id) ? 0.75 : 0.32;
    }
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt / 260);
      const m = this.shakeT * 6;
      this.world.position.set((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    } else this.world.position.set(0, 0);
    // Marker rings under the acting foe and anything that can be targeted.
    this.rings.clear();
    const pulse = 0.55 + 0.45 * Math.sin(secs * 6);
    for (const id of this.targetIds) {
      const a = this.actors.get(id);
      if (a) this.drawRing(a, 0xc8322c, pulse);
    }
    if (this.activeId) {
      const a = this.actors.get(this.activeId);
      if (a) this.drawRing(a, 0xd9a441, 0.9);
    }
  }

  private drawRing(a: Actor, color: number, alpha: number): void {
    const w = a.sprite.width * 0.45;
    this.rings.ellipse(a.homeX, a.homeY - 2, w, w * 0.18).stroke({ color, width: 2.5, alpha });
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
