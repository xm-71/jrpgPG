// Look 2: Jujutsu Kaisen. Akutami's rough, brushy ink and MAPPA's cold palette: sharp narrow eyes with a
// heavy upper lash, messy spiked hair with big solid-black shadow, hatching on the cheek, a near-black
// uniform, and cursed energy as black flame edged in blue, cracking with red-and-black sparks.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#0B0A0E';
const C = {
  skin: '#E9C6AE', skinS: '#B98E7C', skinD: '#7A5A56',
  hair: '#3A2620', hairS: '#0E0809', hairH: '#8C7068',
  eye: '#C98A3A', eyeS: '#6A3A12',
};
const BODY: BodyStyle = {
  line: LINE, lw: 2.6,
  skin: C.skin, skinS: C.skinS,
  jacket: '#1E1B26', jacketS: '#0A090E', jacketH: '#34324A',
  under: '#D8D4CC', underS: '#9A968E',
  scarf: '#A82C4A', scarfS: '#5A1024', scarfH: '#D65A78',
  glove: '#1A1418', gloveS: '#050405',
  brass: '#8E8A80', brassS: '#4A4640',
  strap: '#3A2E2A', strapS: '#1A1412',
};

function messySpikes(): Array<{ root: P; tip: P; w: number; bow: number }> {
  const rnd = K.seeded(21);
  const out: Array<{ root: P; tip: P; w: number; bow: number }> = [];
  const c: P = [392, 300];
  for (let i = 0; i < 15; i++) {
    const a = Math.PI * (1.02 + (i / 14) * 1.0); // left, over the top, to the right
    const r0 = 118 + rnd() * 10;
    const root: P = [c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0 * 1.02];
    const len = 60 + rnd() * 70 + (Math.abs(Math.sin(a)) > 0.8 ? 30 : 0);
    const bend = (rnd() - 0.3) * 0.5;
    const tip: P = [root[0] + Math.cos(a + bend) * len, root[1] + Math.sin(a + bend) * len];
    out.push({ root, tip, w: 46 + rnd() * 26, bow: (rnd() - 0.5) * 0.5 });
  }
  return out;
}
function locks(): Array<{ root: P; tip: P; w: number; bow: number }> {
  return [
    { root: [296, 258], tip: [266, 350], w: 44, bow: 0.14 },
    { root: [330, 250], tip: [300, 372], w: 54, bow: 0.18 },
    { root: [364, 246], tip: [344, 350], w: 48, bow: 0.1 },
    { root: [398, 244], tip: [396, 364], w: 50, bow: 0.02 },
    { root: [434, 248], tip: [446, 340], w: 46, bow: -0.1 },
    { root: [470, 262], tip: [490, 334], w: 40, bow: -0.14 },
    { root: [494, 290], tip: [508, 358], w: 34, bow: -0.1 },
  ];
}

const face = K.blob(
  [[300, 246], [276, 300], [274, 350], [281, 372], [276, 404], [292, 448], [324, 490], [350, 514], [378, 506], [420, 480], [460, 448], [484, 414], [492, 378], [496, 300], [462, 232], [380, 214]],
  0.5,
);

function head(): string {
  const cel = (ds: string[], fill: string, w = 5): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  const mass = K.blob([[264, 330], [256, 250], [300, 180], [392, 158], [486, 186], [528, 262], [516, 350], [470, 300], [380, 280], [300, 300]], 0.8);
  const sp = messySpikes().map((s) => spike(s.root, s.tip, s.w, s.bow));
  const lk = locks().map((s) => spike(s.root, s.tip, s.w, s.bow));
  const ear = K.blob([[486, 360], [510, 352], [522, 380], [516, 420], [496, 438], [484, 424]], 0.8);
  let out = '';
  out += cel([mass, ...sp], C.hair);
  // big solid black shadow over the right half and underside of the hair
  out += K.clipped([mass, ...sp].join(''), K.fill(K.polyD([[400, 120], [700, 60], [700, 420], [300, 420], [330, 330], [420, 250]]), C.hairS) + K.fill(K.polyD([[200, 280], [300, 290], [280, 340], [200, 340]]), C.hairS));
  // thin cold highlight strokes
  for (const h of [[[300, 196], [258, 168]], [[346, 176], [326, 128]], [[392, 170], [396, 118]]] as P[][]) out += K.clipped([mass, ...sp].join(''), K.ink(h, 4, C.hairH, { in: 0.4, out: 0.5 }));
  out += cel([ear, face], C.skin);
  out += K.clipped(ear, K.fill(K.blob([[500, 370], [514, 380], [508, 414], [494, 420]]), C.skinS)) + K.ink([[500, 372], [510, 388], [504, 410]], 2.4, LINE);
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), C.hair);
  // hard shadow: the whole right side of the face, cut with a clean edge, plus the fringe shadow
  const side = K.polyD([[444, 300], [540, 300], [540, 540], [360, 540], [400, 500], [438, 472], [458, 436], [454, 400], [440, 372], [452, 340]]);
  const fringe = K.polyD([[270, 300], [540, 300], [540, 356], [508, 364], [490, 330], [470, 352], [446, 330], [398, 378], [390, 340], [344, 386], [326, 346], [296, 370], [270, 364]]);
  out += K.clipped(face, K.fill(side, C.skinS) + K.fill(fringe, C.skinS));
  // hatching under the eye and down the shadowed cheek
  let hatch = '';
  for (let i = 0; i < 5; i++) hatch += `M${452 + i * 6} ${440 + i * 3}l10 -12`;
  out += K.clipped(face, K.line(hatch, LINE, 1.6));
  out += K.clipped(face, K.fill(K.polyD([[440, 470], [520, 430], [520, 540], [380, 540]]), C.skinD));
  // brows: straight, heavy, slightly raised at the outer end
  out += K.ink([[382, 352], [414, 346], [452, 342]], 9, LINE, { in: 0.1, out: 0.6, min: 0.3 });
  out += K.ink([[344, 356], [312, 350], [284, 348]], 7, LINE, { in: 0.1, out: 0.6, min: 0.3 });
  // eyes: narrow, heavy upper lash that runs past the corner, small iris, lower lash on the outer half
  const eyeN = K.blob([[384, 388], [410, 380], [444, 380], [448, 392], [424, 402], [394, 400]], 0.5);
  const eyeF = K.blob([[290, 386], [310, 380], [334, 386], [330, 398], [306, 400], [292, 394]], 0.5);
  for (const [eye, c, r] of [[eyeN, [414, 391] as P, 10], [eyeF, [316, 391] as P, 8]] as const) {
    out += K.fill(eye, '#F2F0EE');
    out += K.clipped(eye, K.fill(K.ellipse(c, r, r * 1.05), C.eye) + K.fill(K.ellipse([c[0], c[1] - r * 0.4], r, r * 0.55), C.eyeS) + K.fill(K.ellipse(c, r * 0.42, r * 0.5), LINE) + K.fill(K.ellipse([c[0] - r * 0.4, c[1] - r * 0.4], r * 0.2, r * 0.2), '#FFFFFF') + K.fill(K.polyD([[c[0] - 40, c[1] - 20], [c[0] + 40, c[1] - 20], [c[0] + 40, c[1] - r * 0.5], [c[0] - 40, c[1] - r * 0.7]]), 'rgba(0,0,0,.28)'));
  }
  out += K.ink([[380, 392], [398, 380], [430, 376], [452, 378], [462, 384]], 7.5, LINE, { in: 0.2, out: 0.15, min: 0.3 });
  out += K.ink([[426, 402], [446, 396]], 2.4, LINE, { in: 0.3, out: 0.5 });
  out += K.ink([[396, 412], [420, 414], [440, 410]], 1.8, LINE, { in: 0.4, out: 0.4 });
  out += K.ink([[340, 390], [318, 380], [296, 380], [284, 388]], 6.5, LINE, { in: 0.15, out: 0.2, min: 0.3 });
  // nose: a small shadow block at the tip
  out += K.fill(K.polyD([[344, 424], [336, 434], [350, 438]]), C.skinD) + K.ink([[352, 404], [340, 428], [344, 436]], 2.2, LINE, { in: 0.4, out: 0.2 });
  // mouth: a one-sided smirk
  out += K.ink([[326, 468], [350, 470], [372, 466], [384, 458]], 3.4, LINE, { in: 0.2, out: 0.3 });
  out += K.ink([[342, 480], [360, 481]], 2, LINE, { in: 0.5, out: 0.5 });
  // messy locks over the forehead
  out += cel(lk, C.hair);
  out += K.clipped(lk.join(''), K.fill(K.polyD([[250, 230], [540, 230], [540, 380], [250, 380]]), 'rgba(0,0,0,0)') + locks().map((s) => { const n = K.perp(K.unit(K.sub(s.tip, s.root))); return K.fill(spike(K.add(s.root, K.mul(n, -s.w * 0.25)), K.lerp(s.tip, s.root, 0.02), s.w * 0.5, s.bow), C.hairS); }).join(''));
  return out;
}

/** Cursed energy: black flame with a thin blue edge, torn by noise. */
function cursedFlame(c: P, scale: number, seed: number, count = 9): { defs: string[]; body: string } {
  const rough = K.roughFilter(18 * scale, 0.03, seed);
  const soft = K.blurFilter(10 * scale);
  const rnd = K.seeded(seed);
  let flame = '';
  let core = '';
  for (let i = 0; i < count; i++) {
    const x = c[0] + (rnd() - 0.5) * 150 * scale;
    const root: P = [x, c[1] + 50 * scale];
    const tip: P = [x + (rnd() - 0.5) * 90 * scale, c[1] - (120 + rnd() * 190) * scale];
    const w = (60 + rnd() * 50) * scale;
    const bow = (rnd() - 0.5) * 0.6;
    flame += spike(root, tip, w, bow);
    core += spike([root[0], root[1] + 6 * scale], K.lerp(root, tip, 0.9), w * 0.78, bow);
  }
  flame += K.ellipse([c[0], c[1] + 40 * scale], 110 * scale, 60 * scale);
  core += K.ellipse([c[0], c[1] + 44 * scale], 96 * scale, 50 * scale);
  const body =
    `<g filter="url(#${soft.id})" opacity=".7">` + K.fill(flame, '#2F5BFF') + `</g>` +
    `<g filter="url(#${rough.id})">` + K.fill(flame, '#5C86FF') + K.fill(core, '#07050C') + `</g>`;
  return { defs: [rough.def, soft.def], body };
}

/** Black Flash style sparks: jagged black bolts inside a red glow. */
function sparks(c: P, r: number, seed: number, arc: [number, number] = [0, Math.PI * 2]): string {
  const rnd = K.seeded(seed);
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = arc[0] + rnd() * (arc[1] - arc[0]);
    let p: P = [c[0] + Math.cos(a) * r * 0.35, c[1] + Math.sin(a) * r * 0.35];
    d += `M${K.pt(p)}`;
    for (let j = 0; j < 6; j++) {
      const aa = a + (j % 2 ? 1 : -1) * (0.3 + rnd() * 0.9);
      const step = r * (0.05 + rnd() * 0.16);
      p = [p[0] + Math.cos(aa) * step, p[1] + Math.sin(aa) * step];
      d += `L${K.pt(p)}`;
    }
  }
  return `<g filter="url(#sparkglow)">` + K.line(d, '#FF1B34', 12) + `</g>` + K.line(d, '#050305', 5.5);
}
const SPARK_GLOW = `<filter id="sparkglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

export function hero(): string {
  const paper = K.linear([[0, '#D9D6D2'], [1, '#A8A4A6']]);
  const grain = K.grainFilter(0.1, 0.8);
  const wash = K.roughFilter(40, 0.012, 5);
  const wobble = K.roughFilter(2.2, 0.06, 2);
  const flame = cursedFlame([172, 470], 0.8, 8, 8);
  let bg = `<rect width="800" height="1000" fill="url(#${paper.id})"/>`;
  // a red sun disk behind the head and heavy ink washes
  bg += K.fill(K.ellipse([470, 330], 250, 250), '#C8202E');
  bg += `<g filter="url(#${wash.id})">` + K.fill(K.polyD([[0, 640], [800, 560], [800, 1000], [0, 1000]]), '#141218') + K.fill(K.polyD([[0, 0], [220, 0], [140, 260], [0, 360]]), '#141218') + K.fill(K.polyD([[640, 0], [800, 0], [800, 200]]), '#141218') + `</g>`;
  // ink splatter
  const rnd = K.seeded(3);
  for (let i = 0; i < 40; i++) bg += K.fill(K.ellipse([rnd() * 800, 560 + rnd() * 440], 1 + rnd() * 5, 1 + rnd() * 5), '#141218');
  const lanternGlass = K.fill(K.ellipse([182, 646], 60, 70), '#1A1830') + K.fill(K.blob([[182, 596], [204, 640], [198, 676], [182, 684], [166, 676], [160, 640]], 1), '#050308') + K.fill(K.blob([[182, 616], [192, 646], [182, 668], [172, 646]], 1), '#5A84FF');
  const figure = bodyBack(BODY) + head() + armFront(BODY, lanternGlass, '#2A2840');
  const body = bg + `<g filter="url(#${wobble.id})">` + figure + `</g>` + `<g opacity=".93">` + flame.body + `</g>` + sparks([150, 560], 260, 12, [Math.PI * 0.55, Math.PI * 1.35]) + sparks([600, 860], 180, 19, [-0.6, 0.9]) + `<rect width="800" height="1000" filter="url(#${grain.id})"/>`;
  return K.svg(K.W, K.H, [paper.def, grain.def, wash.def, wobble.def, SPARK_GLOW, ...flame.defs], body);
}

export function fade(): string {
  // A cursed spirit: the Acolyte's robe torn into black curse-mass, extra mouths and eyes, stitched mask.
  const bgG = K.linear([[0, '#1A1822'], [1, '#3A3440']]);
  const grain = K.grainFilter(0.12, 0.8);
  const rough = K.roughFilter(22, 0.02, 7);
  const wobble = K.roughFilter(2.4, 0.06, 4);
  const aura = cursedFlame([400, 900], 2.2, 5);
  let out = `<rect width="800" height="1000" fill="url(#${bgG.id})"/>`;
  out += K.fill(K.ellipse([400, 320], 280, 280), '#8E1622');
  out += aura.body;
  // robe dissolving into a curse mass at the edges
  out += `<g filter="url(#${rough.id})">` + K.fill(F.robe, '#050408') + K.fill(F.hoodOuter, '#050408') + `</g>`;
  let fig = '';
  fig += K.shape(F.hoodOuter, '#15131C', LINE, 5) + K.shape(F.robe, '#15131C', LINE, 5);
  fig += K.clipped(F.robe, K.fill(K.polyD([[300, 480], [520, 480], [560, 1010], [240, 1010]]), '#26232F'));
  fig += K.clipped(F.hoodOuter, K.fill(K.polyD([[260, 140], [400, 110], [360, 520], [200, 520]]), '#26232F'));
  // extra eyes opening along the robe
  const eyes: Array<[P, number]> = [[[250, 760], 16], [[560, 700], 22], [[500, 880], 14], [[300, 900], 18], [[610, 580], 12]];
  for (const [c, r] of eyes) {
    const e = K.blob([[c[0] - r * 1.6, c[1]], [c[0], c[1] - r * 0.8], [c[0] + r * 1.6, c[1]], [c[0], c[1] + r * 0.8]], 0.7);
    fig += K.shape(e, '#E8E2D0', LINE, 3) + K.clipped(e, K.fill(K.ellipse(c, r * 0.6, r * 0.6), '#C8202E') + K.fill(K.ellipse(c, r * 0.22, r * 0.5), LINE));
  }
  // a second mouth across the chest, full of teeth
  const maw = K.blob([[300, 780], [400, 760], [500, 780], [470, 830], [400, 846], [330, 830]], 0.7);
  fig += K.shape(maw, '#2A060C', LINE, 4) + K.clipped(maw, K.line('M320 786 l10 22 l10 -22 l10 24 l10 -24 l10 26 l10 -26 l10 26 l10 -26 l10 26 l10 -26 l10 24 l10 -24 l10 22 l10 -22 l10 20', '#E8E2D0', 5));
  fig += K.fill(F.hoodHole, '#050408');
  fig += K.shape(F.mask, '#E4E0D6', LINE, 4);
  fig += K.clipped(F.mask, K.fill(K.polyD([[420, 220], [520, 220], [520, 470], [400, 470], [470, 400], [476, 300]]), '#A09A94'));
  // stitches across the mask and a split down its middle
  fig += K.line('M400 232 L396 300 L404 340 L398 400 L402 456', LINE, 3);
  for (let y = 250; y < 450; y += 22) fig += K.line(`M390 ${y} l20 6`, LINE, 2.4);
  // four eyes, and the smile split wide
  for (const [c, r] of [[F.eyeL, 14], [F.eyeR, 14], [[352, 290] as P, 8], [[448, 290] as P, 8]] as Array<[P, number]>) fig += K.fill(K.ellipse(c, r, r * 0.7), LINE) + K.fill(K.ellipse(c, r * 0.4, r * 0.4), '#E0182E');
  fig += K.shape(F.smile, '#3A060E', LINE, 3) + K.clipped(F.smile, K.line('M346 392 l8 14 l8 -12 l8 16 l8 -16 l8 18 l8 -18 l8 18 l8 -18 l8 16 l8 -16 l8 14 l8 -12', '#E8E2D0', 4));
  // hands: too many fingers, clutching the candle
  for (const h of [F.handL, F.handR]) fig += K.shape(h, '#6E6A78', LINE, 3);
  fig += K.line('M354 640 l-20 -14 M352 656 l-24 -4 M354 672 l-22 6 M446 640 l20 -14 M448 656 l24 -4 M446 672 l22 6', LINE, 3);
  fig += K.shape(F.candle, '#D8D2C4', LINE, 3) + K.fill(F.drip, '#EEE8DA');
  out += `<g filter="url(#${wobble.id})">` + fig + `</g>`;
  const fl = cursedFlame([400, 548], 0.3, 9, 6);
  out += fl.body + sparks([170, 840], 160, 23, [Math.PI * 0.9, Math.PI * 1.5]) + sparks([640, 760], 150, 31, [-0.8, 0.2]);
  out += `<rect width="800" height="1000" filter="url(#${grain.id})"/>`;
  return K.svg(K.W, K.H, [bgG.def, grain.def, rough.def, wobble.def, SPARK_GLOW, ...aura.defs, ...fl.defs], out);
}
