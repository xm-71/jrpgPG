// Look 5: Bleach. Kubo's graphic restraint: a figure cut out against empty white, black clothes with
// clean white edges, one accent colour, sharp narrow faces drawn with few, thin lines, spiked hair in
// long clean blades, reiatsu as a single sweeping stroke, and a line of poetry set vertically.
// The Fade uses the Thousand-Year Blood War trick: an inverted, negative frame in black, white and red.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#0A0A0C';
const BODY: BodyStyle = {
  line: LINE, lw: 1.6,
  skin: '#F3DCC8', skinS: '#B9A0A4',
  jacket: '#0C0C10', jacketS: '#0C0C10', jacketH: '#0C0C10',
  under: '#FFFFFF', underS: '#C8C8D0',
  scarf: '#D8203A', scarfS: '#8A0E22', scarfH: '#FF5A6E',
  glove: '#0C0C10', gloveS: '#0C0C10',
  brass: '#E8E8EC', brassS: '#A8A8B4',
  strap: '#FFFFFF', strapS: '#C8C8D0',
};

const face = K.blob(
  [[302, 246], [280, 300], [278, 352], [284, 374], [282, 410], [300, 456], [332, 500], [356, 522], [380, 512], [424, 484], [462, 450], [486, 414], [492, 378], [496, 300], [462, 232], [380, 214]],
  0.45,
);

function head(): string {
  const cel = (ds: string[], fill: string, w = 3.2): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  // long clean blades of hair
  const blades: Array<[P, P, number, number]> = [
    [[288, 214], [150, 150], 80, 0.06], [[320, 186], [210, 60], 80, 0.12], [[364, 168], [330, 20], 80, 0.06], [[414, 164], [450, 14], 80, -0.04],
    [[466, 180], [590, 60], 84, -0.08], [[504, 226], [680, 170], 84, -0.06], [[518, 290], [680, 318], 70, -0.04], [[262, 270], [132, 250], 70, 0.08],
  ];
  const fringe: Array<[P, P, number, number]> = [
    [[296, 262], [258, 380], 50, 0.1], [[336, 250], [318, 410], 54, 0.08], [[378, 246], [372, 380], 48, 0.03], [[420, 248], [436, 360], 48, -0.06], [[462, 262], [490, 348], 42, -0.1],
  ];
  const mass = K.blob([[262, 330], [254, 250], [300, 176], [396, 150], [494, 184], [530, 266], [514, 350], [470, 300], [380, 280], [300, 300]], 0.8);
  const sp = blades.map(([r, t, w, b]) => spike(r, t, w, b));
  const fr = fringe.map(([r, t, w, b]) => spike(r, t, w, b));
  const ear = K.blob([[486, 360], [510, 352], [522, 380], [516, 420], [496, 438], [484, 424]], 0.8);
  let out = cel([mass, ...sp], '#3A2420');
  // Kubo shades hair with a clean black block, no gradient
  out += K.clipped([mass, ...sp].join(''), K.fill(K.polyD([[400, 150], [700, 100], [700, 400], [340, 420], [400, 280]]), LINE));
  out += cel([ear, face], '#F3DCC8');
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), '#3A2420');
  // one flat shadow shape in cool grey
  out += K.clipped(face, K.fill(K.polyD([[452, 300], [540, 300], [540, 560], [370, 560], [412, 506], [450, 466], [466, 424], [458, 392], [474, 350]]), '#C9B4B6') + K.fill(K.polyD([[270, 300], [540, 300], [540, 360], [270, 360]]), '#C9B4B6'));
  // brows: thin, straight, drawn down at the centre
  out += K.ink([[386, 360], [420, 348], [456, 346]], 4.6, LINE, { in: 0.1, out: 0.6, min: 0.3 });
  out += K.ink([[344, 364], [312, 354], [286, 354]], 4, LINE, { in: 0.1, out: 0.6, min: 0.3 });
  // eyes: narrow, sharp, the upper line long and fine
  const eyeN = K.blob([[386, 392], [412, 382], [446, 382], [454, 390], [428, 400], [398, 400]], 0.5);
  const eyeF = K.blob([[294, 388], [314, 382], [334, 388], [330, 398], [308, 400], [296, 394]], 0.5);
  for (const [eye, c, r] of [[eyeN, [418, 391] as P, 8.5], [eyeF, [318, 391] as P, 6.5]] as const) out += K.fill(eye, '#FFFFFF') + K.clipped(eye, K.fill(K.ellipse(c, r, r * 1.1), '#8A5A2A') + K.fill(K.ellipse(c, r * 0.45, r * 0.55), LINE) + K.fill(K.ellipse([c[0] - 3, c[1] - 3], 1.8, 1.8), '#FFFFFF'));
  out += K.ink([[378, 394], [400, 382], [436, 378], [466, 382]], 4.4, LINE, { in: 0.1, out: 0.3, min: 0.3 });
  out += K.ink([[342, 392], [318, 382], [294, 382], [278, 388]], 3.8, LINE, { in: 0.1, out: 0.3, min: 0.3 });
  out += K.ink([[410, 404], [436, 402]], 1.4, LINE, { in: 0.5, out: 0.5 });
  // nose: a single line; mouth: a flat, unimpressed line
  out += K.ink([[354, 404], [342, 438], [352, 442]], 1.8, LINE, { in: 0.5, out: 0.2 });
  out += K.ink([[336, 476], [362, 478], [384, 474]], 2.4, LINE, { in: 0.3, out: 0.3 });
  out += cel(fr, '#3A2420', 3);
  out += K.clipped(fr.join(''), fringe.map(([r, t, w, b]) => { const n = K.perp(K.unit(K.sub(t, r))); return K.fill(spike(K.add(r, K.mul(n, -w * 0.25)), K.lerp(t, r, 0.02), w * 0.5, b), LINE); }).join(''));
  return out;
}

export function hero(): string {
  const reiatsu = K.linear([[0, '#FFFFFF', 0], [0.5, '#9FD2FF', 0.9], [1, '#2A6CFF', 0.95]], 0, 0, 1, 1);
  const blur = K.blurFilter(3);
  let bg = `<rect width="800" height="1000" fill="#FAFAF8"/>`;
  // one sweeping stroke of spiritual pressure behind the figure
  bg += `<g filter="url(#${blur.id})">` + K.fill(K.brush([[40, 980], [200, 500], [460, 150], [790, 40]], 170, { in: 0.2, out: 0.6, min: 0.05 }), `url(#${reiatsu.id})`) + `</g>`;
  bg += K.fill(K.brush([[80, 960], [240, 520], [480, 190], [780, 70]], 20, { in: 0.2, out: 0.7 }), '#FFFFFF');
  // thin speed hairlines
  for (let i = 0; i < 18; i++) bg += K.line(`M${620 + i * 9} ${420 + i * 22}l140 -60`, '#0A0A0C', 1, 'opacity=".25"');
  // a vertical line of poetry, set the way Kubo sets his volume poems
  const words = 'WHAT BURNS AT DUSK'.split('');
  let col = '';
  words.forEach((ch, i) => (col += `<text x="736" y="${90 + i * 27}" text-anchor="middle" font-family="DejaVu Serif, serif" font-size="20" fill="#0A0A0C">${ch === ' ' ? '' : ch}</text>`));
  const glass = K.fill(K.ellipse([182, 646], 60, 70), '#FFFFFF') + K.fill(K.ellipse([182, 650], 20, 30), '#9FD2FF');
  // black clothes read by their white edges
  const edges =
    K.line('M300 650 L340 690 L390 668 M468 668 L522 682 L552 640', '#FFFFFF', 3) +
    K.line('M430 770 L436 860 L446 1000', '#FFFFFF', 2) +
    K.line('M118 780 L136 690 L162 600', '#FFFFFF', 2.4) +
    K.line('M700 780 L716 880 L730 1000', '#FFFFFF', 2);
  const figure = bodyBack(BODY) + edges + head() + armFront(BODY, glass, '#FFFFFF');
  return K.svg(K.W, K.H, [reiatsu.def, blur.def], bg + figure + col);
}

export function fade(): string {
  // Negative frame: black ground, the figure in white line, red where the light would be.
  const RED = '#E0182E';
  let out = `<rect width="800" height="1000" fill="#050507"/>`;
  out += K.fill(K.ellipse([400, 330], 290, 290), RED);
  out += K.fill(K.ellipse([400, 330], 250, 250), '#050507');
  for (let i = 0; i < 26; i++) out += K.line(`M${i * 34} 1000 L${400 + (i - 13) * 6} 520`, '#FFFFFF', 1, 'opacity=".22"');
  const W2 = '#F4F4F2';
  out += K.shape(F.robe, '#050507', W2, 3) + K.shape(F.hoodOuter, '#050507', W2, 3);
  out += K.shape(F.sleeveL, '#050507', W2, 3) + K.shape(F.sleeveR, '#050507', W2, 3);
  // a hole straight through the chest, the candle burning inside it
  const hole = K.blob([[340, 600], [400, 572], [460, 600], [470, 660], [400, 700], [330, 660]], 0.9);
  out += K.shape(hole, RED, W2, 3);
  // the mask as bone: white, with red markings and a jaw of teeth
  out += K.fill(F.hoodHole, '#050507');
  out += K.shape(F.mask, W2, '#050507', 3);
  out += K.clipped(F.mask, K.fill(K.polyD([[340, 240], [360, 240], [372, 460], [352, 460]]), RED) + K.fill(K.polyD([[440, 240], [460, 240], [448, 460], [428, 460]]), RED));
  out += K.fill(K.ellipse(F.eyeL, 20, 12), '#050507') + K.fill(K.ellipse(F.eyeR, 20, 12), '#050507');
  out += K.fill(K.ellipse([362, 338], 4, 4), RED) + K.fill(K.ellipse([438, 338], 4, 4), RED);
  out += K.shape(F.smile, '#050507', '#050507', 2) + K.clipped(F.smile, K.line('M346 392 v30 M362 398 v30 M378 402 v30 M394 404 v30 M410 404 v30 M426 402 v30 M442 398 v30 M458 392 v30', W2, 5));
  out += K.shape(F.handL, W2, '#050507', 2) + K.shape(F.handR, W2, '#050507', 2);
  out += K.shape(F.candle, W2, '#050507', 2);
  out += K.fill(F.flame, '#FFFFFF');
  // fine white line work down the robe
  for (const f of [[[300, 720], [260, 1000]], [[500, 720], [540, 1000]], [[400, 720], [400, 1000]]] as P[][]) out += K.ink(f, 2.4, W2, { in: 0.2, out: 0.3 });
  return K.svg(K.W, K.H, [], out);
}
