import { profile } from './store';

/**
 * A tiny synthesised sound kit, so the game has feedback without shipping audio files.
 * Sounds start only after the first tap, as browsers require.
 */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (!profile.peek().settings.sound) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slideTo?: number, delay = 0): void {
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone(620, 0.05, 'triangle', 0.04),
  hit: () => tone(180, 0.12, 'sawtooth', 0.07, 60),
  weak: () => {
    tone(260, 0.1, 'sawtooth', 0.07, 90);
    tone(760, 0.12, 'square', 0.04, 1100, 0.04);
  },
  crit: () => tone(1200, 0.14, 'square', 0.05, 400),
  heal: () => {
    tone(520, 0.12, 'sine', 0.05);
    tone(780, 0.16, 'sine', 0.05, undefined, 0.09);
  },
  break: () => {
    tone(140, 0.32, 'sawtooth', 0.09, 40);
    tone(900, 0.2, 'square', 0.05, 200, 0.02);
  },
  encore: () => {
    tone(660, 0.08, 'square', 0.05);
    tone(990, 0.12, 'square', 0.05, undefined, 0.07);
  },
  pass: () => tone(440, 0.16, 'triangle', 0.06, 880),
  ult: () => {
    tone(220, 0.5, 'sawtooth', 0.07, 880);
    tone(110, 0.5, 'square', 0.05, 440);
  },
  burst: () => {
    for (let i = 0; i < 5; i++) tone(200 + i * 90, 0.18, 'square', 0.05, undefined, i * 0.07);
  },
  ko: () => tone(300, 0.4, 'triangle', 0.06, 60),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, undefined, i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, undefined, i * 0.16)),
  pull: (rarity: 3 | 4 | 5) => {
    if (rarity === 3) tone(520, 0.1, 'triangle', 0.04);
    else if (rarity === 4) [660, 880].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, undefined, i * 0.08));
    else [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.07, undefined, i * 0.09));
  },
  spend: () => tone(320, 0.1, 'triangle', 0.05, 200),
};
