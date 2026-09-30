// Look 4: Solo Leveling. The Korean webtoon look A-1 Pictures animated: realistic proportions, thin
// coloured lines, painted shading with soft gradients and hard rim light, eyes that glow when power
// rises, shadow smoke, dungeon gates, and the blue "System" window that narrates the climb.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#241820';
const BODY: BodyStyle = {
  line: LINE, lw: 1.8,
  skin: '#E6C1A6', skinS: '#A07A72',
  jacket: '#1C1A26', jacketS: '#0C0B12', jacketH: '#3C3858',
  under: '#CFCBD6', underS: '#7E7A90',
  scarf: '#B83A64', scarfS: '#5C1634', scarfH: '#F07AA0',
  glove: '#16131A', gloveS: '#050406',
  brass: '#9C8A70', brassS: '#4C3E30',
  strap: '#2E2426', strapS: '#141012',
};

const face = K.blob(
  [[300, 246], [278, 300], [276, 352], [283, 374], [279, 406], [296, 450], [326, 490], [352, 512], [380, 506], [424, 482], [462, 450], [486, 414], [492, 378], [496, 300], [462, 232], [380, 214]],
  0.6,
);

function head(): string {
  const blur = K.blurFilter(7);
  const glow = K.glowFilter(5, 2.2);
  const hairG = K.linear([[0, '#2A1C1C'], [0.7, '#3E2A26'], [1, '#1A1014']]);
  let defs = blur.def + glow.def + hairG.def;
  // hair: many thin locks, falling rather than standing, with a painted highlight band
  const locks: Array<[P, P, number, number]> = [];
  const rnd = K.seeded(44);
  for (let i = 0; i < 20; i++) {
    const a = Math.PI * (1.0 + (i / 19) * 1.0);
    const root: P = [392 + Math.cos(a) * 112, 290 + Math.sin(a) * 124];
    const out = K.unit(K.sub(root, [392, 290]));
    const len = 70 + rnd() * 60;
    const tip: P = [root[0] + out[0] * len * 0.8, root[1] + out[1] * len * 0.5 + len * 0.35];
    locks.push([root, tip, 36 + rnd() * 20, (rnd() - 0.5) * 0.6]);
  }
  const mass = K.blob([[266, 340], [256, 250], [300, 184], [392, 160], [486, 190], [528, 264], [518, 352], [470, 300], [380, 280], [300, 300]], 0.8);
  const sp = locks.map(([r, t, w, b]) => spike(r, t, w, b));
  const fringeL: Array<[P, P, number, number]> = [
    [[300, 256], [274, 376], 46, 0.2], [[334, 246], [320, 396], 50, 0.16], [[370, 244], [364, 380], 46, 0.06], [[406, 244], [420, 384], 48, -0.06], [[444, 252], [470, 360], 44, -0.14], [[478, 270], [504, 364], 38, -0.16],
  ];
  const fr = fringeL.map(([r, t, w, b]) => spike(r, t, w, b));
  const ear = K.blob([[486, 360], [510, 352], [522, 380], [516, 420], [496, 438], [484, 424]], 0.8);
  let out = '';
  out += [mass, ...sp].map((d) => K.shape(d, 'none', LINE, 3.4)).join('') + [mass, ...sp].map((d) => K.fill(d, `url(#${hairG.id})`)).join('');
  out += K.clipped([mass, ...sp].join(''), `<g filter="url(#${blur.id})">` + K.ink([[300, 226], [360, 196], [430, 198]], 14, '#4E3C44') + `</g>` + K.ink([[318, 214], [360, 196], [410, 196]], 3, '#9A88AA', { in: 0.4, out: 0.4 }));
  // rim light, cold violet, down the right edge of the hair
  out += K.clipped([mass, ...sp].join(''), `<g filter="url(#${blur.id})">` + K.fill(K.polyD([[522, 250], [600, 250], [600, 380], [512, 370]]), '#5A48C8') + `</g>`);
  out += [ear, face].map((d) => K.shape(d, 'none', LINE, 3.4)).join('') + [ear, face].map((d) => K.fill(d, '#E6C1A6')).join('');
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), '#2A1C1C');
  // painted form shadow: soft-edged, and a hard violet rim on the jaw
  out += K.clipped(face, `<g filter="url(#${blur.id})">` + K.fill(K.polyD([[450, 290], [560, 290], [560, 560], [360, 560], [420, 500], [456, 452], [466, 400]]), '#9A7068') + K.fill(K.polyD([[260, 300], [540, 300], [540, 372], [260, 360]]), '#9A7068') + `</g>`);
  out += K.clipped(face, `<g filter="url(#${glow.id})">` + K.ink([[488, 380], [480, 420], [458, 454], [420, 484]], 5, '#9C86FF', { in: 0.2, out: 0.3 }) + `</g>`);
  out += K.clipped(face, K.fill(K.polyD([[266, 380], [296, 372], [300, 440], [276, 420]]), 'rgba(255,200,140,.28)'));
  out += K.clipped(ear, K.fill(K.blob([[500, 370], [516, 380], [510, 414], [496, 420]]), '#A07A72'));
  // brows: level, thin, calm
  out += K.ink([[384, 358], [418, 352], [454, 354]], 5, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  out += K.ink([[344, 362], [314, 356], [288, 358]], 4.5, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  // eyes: narrow and calm, the irises glowing violet-blue
  const eyeN = K.blob([[384, 390], [410, 382], [444, 382], [450, 392], [424, 400], [394, 400]], 0.6);
  const eyeF = K.blob([[292, 388], [312, 382], [334, 388], [330, 398], [306, 400], [294, 394]], 0.6);
  for (const [eye, c, r] of [[eyeN, [416, 391] as P, 9], [eyeF, [316, 391] as P, 7]] as const) {
    out += K.fill(eye, '#DCD6E8');
    out += K.clipped(eye, K.fill(K.ellipse(c, r, r), '#6A7CFF') + K.fill(K.ellipse(c, r * 0.5, r * 0.5), '#E8F0FF') + K.fill(K.polyD([[c[0] - 40, c[1] - 20], [c[0] + 40, c[1] - 20], [c[0] + 40, c[1] - r * 0.5], [c[0] - 40, c[1] - r * 0.7]]), 'rgba(0,0,0,.35)'));
    out += `<g filter="url(#${glow.id})" opacity=".85">` + K.fill(K.ellipse(c, r * 1.3, r * 0.8), '#5A7CFF') + `</g>`;
  }
  // a trail of light from the near eye
  out += `<g filter="url(#${glow.id})">` + K.ink([[430, 390], [480, 380], [560, 360], [640, 350]], 5, '#8FA8FF', { in: 0.05, out: 0.9 }) + `</g>`;
  out += K.ink([[380, 392], [400, 382], [430, 378], [454, 382]], 4.4, LINE, { in: 0.2, out: 0.3, min: 0.3 });
  out += K.ink([[340, 390], [318, 382], [296, 382], [286, 390]], 4, LINE, { in: 0.2, out: 0.3, min: 0.3 });
  out += K.ink([[400, 404], [426, 404], [444, 398]], 1.6, LINE, { in: 0.4, out: 0.4 });
  // nose: a painted plane and a thin line
  out += K.clipped(face, `<g filter="url(#${blur.id})">` + K.fill(K.polyD([[352, 396], [360, 432], [340, 440]]), '#A07A72') + `</g>`);
  out += K.ink([[348, 424], [338, 434], [348, 438]], 2.2, LINE, { in: 0.4, out: 0.3 });
  // mouth: closed, a faint line
  out += K.ink([[330, 466], [356, 468], [380, 464]], 2.6, LINE, { in: 0.3, out: 0.4 }) + K.ink([[346, 478], [362, 478]], 1.6, '#A07A72');
  out += fr.map((d) => K.shape(d, 'none', LINE, 3)).join('') + fr.map((d) => K.fill(d, `url(#${hairG.id})`)).join('');
  out += K.clipped(fr.join(''), K.ink([[330, 270], [338, 320]], 4, '#8E7C98', { in: 0.4, out: 0.4 }) + K.ink([[404, 262], [410, 316]], 4, '#8E7C98', { in: 0.4, out: 0.4 }));
  return `<defs>${defs}</defs>` + out;
}

/** Shadow smoke: soft violet-black plumes rising. */
function smoke(c: P, w: number, h: number, seed: number): { defs: string[]; body: string } {
  const rough = K.roughFilter(40, 0.012, seed);
  const blur = K.blurFilter(10);
  const rnd = K.seeded(seed);
  let d = '';
  for (let i = 0; i < 16; i++) {
    const x = c[0] + (rnd() - 0.5) * w;
    const y = c[1] - rnd() * h;
    d += K.ellipse([x, y], 40 + rnd() * 70, 60 + rnd() * 90);
  }
  return {
    defs: [rough.def, blur.def],
    body: `<g filter="url(#${blur.id})" opacity=".85">` + K.fill(d, '#3A1C6A') + `</g><g filter="url(#${rough.id})" opacity=".9">` + K.fill(d, '#0C0616') + `</g>`,
  };
}

/** The System window: a translucent blue panel with corner brackets and plain white text. */
export function systemWindow(x: number, y: number, w: number, h: number, title: string, lines: string[]): string {
  const glow = `<filter id="sysglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const br = (px: number, py: number, dx: number, dy: number): string => `M${px + dx * 18} ${py}L${px} ${py}L${px} ${py + dy * 18}`;
  let s = `<defs>${glow}</defs><g filter="url(#sysglow)">`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(8,24,58,.78)" stroke="#6FD2FF" stroke-width="1.6"/>`;
  s += K.line(br(x - 6, y - 6, 1, 1) + br(x + w + 6, y - 6, -1, 1) + br(x - 6, y + h + 6, 1, -1) + br(x + w + 6, y + h + 6, -1, -1), '#BDEBFF', 3);
  s += `<rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="34" fill="rgba(111,210,255,.12)" stroke="#6FD2FF" stroke-width="1"/>`;
  s += `<text x="${x + w / 2}" y="${y + 38}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="bold" letter-spacing="4" fill="#E8F8FF">${title}</text>`;
  lines.forEach((l, i) => (s += `<text x="${x + 22}" y="${y + 78 + i * 26}" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#D6F2FF">${l}</text>`));
  return s + '</g>';
}

export function hero(): string {
  const bgG = K.radial([[0, '#1A2A5A'], [0.5, '#0C1230'], [1, '#04050C']], 0.62, 0.35, 0.8);
  const gate = K.radial([[0, '#E8F4FF', 1], [0.2, '#7FB0FF', 0.95], [0.55, '#2A48C8', 0.7], [1, '#0A1440', 0]]);
  const sm = smoke([420, 1000], 900, 420, 6);
  const lantern = K.radial([[0, '#FFF1C8', 0.9], [0.5, '#FFB85A', 0.35], [1, '#FF9A3A', 0]]);
  let bg = `<rect width="800" height="1000" fill="url(#${bgG.id})"/>`;
  // a dungeon gate opening behind the head
  bg += `<g transform="rotate(-8 520 330)">` + K.fill(K.ellipse([520, 330], 250, 300), `url(#${gate.id})`);
  for (let i = 0; i < 5; i++) bg += K.line(K.ellipse([520, 330], 120 + i * 30, 150 + i * 34), '#9CC4FF', 1.4, `opacity="${0.5 - i * 0.08}" stroke-dasharray="${40 + i * 10} ${20 + i * 6}"`);
  bg += `</g>`;
  // shadow soldiers waiting in the dark: silhouettes with glowing eyes
  for (const [x, y, k] of [[70, 700, 1], [700, 680, 1.1], [620, 560, 0.7]] as const) {
    const s = K.blob([[x - 50 * k, y + 300], [x - 60 * k, y + 60 * k], [x - 30 * k, y - 20 * k], [x, y - 60 * k], [x + 30 * k, y - 20 * k], [x + 60 * k, y + 60 * k], [x + 50 * k, y + 300]], 0.8);
    bg += K.fill(s, '#06040C') + K.fill(K.ellipse([x - 12 * k, y - 18 * k], 7 * k, 3 * k), '#8C9CFF') + K.fill(K.ellipse([x + 12 * k, y - 18 * k], 7 * k, 3 * k), '#8C9CFF');
  }
  const glass = K.fill(K.ellipse([182, 646], 60, 70), '#FFD78A') + K.fill(K.ellipse([182, 650], 22, 32), '#FFFFFF');
  const figure = bodyBack(BODY) + head() + armFront(BODY, glass);
  const win = systemWindow(470, 700, 300, 150, 'QUEST', ['Light the Gnomon.', 'Floor 1 of 3  ·  Fades 0 / 5', 'Reward: 120 Gloam']);
  const body = bg + sm.body + figure + K.fill(K.ellipse([182, 640], 170, 170), `url(#${lantern.id})`) + win;
  return K.svg(K.W, K.H, [bgG.def, gate.def, lantern.def, ...sm.defs], body);
}

export function fade(): string {
  const bgG = K.radial([[0, '#16204A'], [0.6, '#080C22'], [1, '#020308']], 0.5, 0.3, 0.9);
  const gate = K.radial([[0, '#FFE8F0', 1], [0.2, '#FF7AA0', 0.9], [0.55, '#8A1A4A', 0.7], [1, '#200614', 0]]);
  const blur = K.blurFilter(8);
  const glow = K.glowFilter(6, 2.4);
  const sm = smoke([400, 1060], 900, 520, 12);
  let out = `<rect width="800" height="1000" fill="url(#${bgG.id})"/>`;
  out += K.fill(K.ellipse([400, 330], 330, 380), `url(#${gate.id})`);
  out += sm.body;
  // painted robe: dark, rim-lit in red from the gate behind
  const robeG = K.linear([[0, '#2A1A2E'], [1, '#0C0810']]);
  out += K.shape(F.robe, `url(#${robeG.id})`, LINE, 2) + K.shape(F.hoodOuter, `url(#${robeG.id})`, LINE, 2);
  out += K.clipped(F.hoodOuter + F.robe, `<g filter="url(#${blur.id})">` + K.line(F.hoodOuter, '#FF5A8A', 18) + K.line(F.robe, '#FF5A8A', 14) + `</g>`);
  out += K.clipped(F.robe, `<g filter="url(#${blur.id})">` + K.fill(K.polyD([[300, 700], [520, 700], [560, 1010], [240, 1010]]), '#05030A') + `</g>`);
  out += K.fill(F.hoodHole, '#040208');
  out += K.shape(F.mask, '#D8D4DE', LINE, 2);
  out += K.clipped(F.mask, `<g filter="url(#${blur.id})">` + K.fill(K.polyD([[420, 220], [520, 220], [520, 470], [390, 470], [470, 400], [476, 300]]), '#6E6880') + `</g>` + K.ink([[350, 262], [334, 300], [330, 350]], 10, '#FFFFFF', { in: 0.3, out: 0.5 }));
  // eyes: burning slits of light
  out += `<g filter="url(#${glow.id})">` + K.fill(K.polyD([[336, 336], [390, 330], [384, 346], [342, 346]]), '#FF3A6A') + K.fill(K.polyD([[464, 336], [410, 330], [416, 346], [458, 346]]), '#FF3A6A') + `</g>`;
  out += `<g filter="url(#${glow.id})">` + K.ink([[338, 340], [300, 330], [230, 300]], 4, '#FF7A9A', { in: 0.05, out: 0.9 }) + `</g>`;
  out += K.shape(F.smile, '#1A0610', LINE, 2) + K.clipped(F.smile, K.fill(K.polyD([[340, 386], [460, 386], [456, 398], [344, 398]]), '#E8E0E6'));
  out += K.shape(F.sleeveL, '#1A1220', LINE, 2) + K.shape(F.sleeveR, '#1A1220', LINE, 2);
  out += K.shape(F.handL, '#8A8296', LINE, 2) + K.shape(F.handR, '#8A8296', LINE, 2);
  out += K.shape(F.candle, '#D8D0DC', LINE, 2) + K.fill(F.drip, '#F0E8F2');
  out += `<g filter="url(#${glow.id})">` + K.fill(F.flame, '#FF6A8A') + K.fill(K.scaleAbout([[400, 470], [410, 510], [400, 540], [390, 510]], [400, 510], 1), '#FFFFFF') + `</g>`;
  out += systemWindow(90, 60, 300, 124, 'WARNING', ['Boss: The Unturning Acolyte', 'Level 34  ·  Rank S']);
  return K.svg(K.W, K.H, [bgG.def, gate.def, blur.def, glow.def, robeG.def, ...sm.defs], out);
}
