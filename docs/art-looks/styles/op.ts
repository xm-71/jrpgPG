// Look 7: One Piece. Oda's rubber-band cartooning: a big round head, a grin that takes up half the face,
// round eyes with small pupils, thick bold line, saturated primary colour and very little shadow (the
// Egghead arc's "kagenashi", no-shadow look with a soft glow), bright sky and sea, and "DON!" lettering.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#1A1414';
const BODY: BodyStyle = {
  line: LINE, lw: 3.4,
  skin: '#FFD2A8', skinS: '#F2B088',
  jacket: '#5A3AA8', jacketS: '#4A2E92', jacketH: '#7A5AD0',
  under: '#FFFFFF', underS: '#E8E4F4',
  scarf: '#FF3A7A', scarfS: '#E02A66', scarfH: '#FF8AB4',
  glove: '#3A2A4A', gloveS: '#2A1E36',
  brass: '#FFC83A', brassS: '#E8A020',
  strap: '#8A5A2A', strapS: '#72481E',
  shade: false,
};

// A rounder, bigger head with a strong jaw that opens wide for the grin.
const face = K.blob(
  [[296, 240], [262, 300], [254, 360], [258, 420], [280, 474], [320, 516], [370, 530], [428, 512], [470, 474], [494, 420], [500, 360], [498, 296], [462, 228], [380, 208]],
  0.9,
);

function head(): string {
  const cel = (ds: string[], fill: string, w = 7): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  const clumps: Array<[P, P, number, number]> = [
    [[290, 220], [196, 150], 100, 0.2], [[340, 184], [300, 70], 110, 0.18], [[404, 172], [420, 56], 112, 0.02], [[466, 190], [560, 100], 110, -0.16], [[506, 250], [620, 222], 96, -0.14], [[262, 270], [176, 270], 80, 0.16],
  ];
  const mass = K.blob([[256, 330], [248, 250], [296, 172], [396, 146], [498, 180], [534, 264], [516, 344], [470, 296], [380, 278], [300, 296]], 0.9);
  const sp = clumps.map(([r, t, w, b]) => spike(r, t, w, b));
  const fringe: Array<[P, P, number, number]> = [[[300, 258], [270, 340], 70, 0.2], [[350, 246], [340, 352], 78, 0.1], [[404, 244], [410, 342], 74, -0.04], [[456, 256], [480, 332], 64, -0.18]];
  const fr = fringe.map(([r, t, w, b]) => spike(r, t, w, b));
  const ear = K.blob([[490, 350], [520, 340], [534, 372], [526, 416], [500, 432], [488, 418]], 0.8);
  let out = cel([mass, ...sp], '#5A3426');
  out += K.clipped([mass, ...sp].join(''), K.ink([[330, 170], [360, 120]], 12, '#8A5A44', { in: 0.4, out: 0.5 }) + K.ink([[420, 160], [424, 110]], 12, '#8A5A44', { in: 0.4, out: 0.5 }));
  // Oda's hatching on hair clumps
  for (const [r, t] of clumps) out += K.ink([K.lerp(r, t, 0.3), K.lerp(r, t, 0.7)], 3, LINE, { in: 0.3, out: 0.4 });
  out += cel([ear, face], '#FFD2A8');
  out += K.fill(K.blob([[260, 330], [256, 262], [316, 210], [420, 200], [504, 232], [514, 300], [480, 290], [400, 272], [320, 286]], 0.8), '#5A3426');
  out += K.clipped(ear, K.line('M504 362 q14 16 4 44', LINE, 3));
  // no shadows on the face; a soft glow instead
  out += K.clipped(face, K.fill(K.ellipse([300, 380], 60, 60), 'rgba(255,255,255,.25)'));
  // brows: thick, raised in delight
  out += K.ink([[380, 342], [416, 326], [452, 332]], 9, LINE, { in: 0.2, out: 0.3, min: 0.4 });
  out += K.ink([[340, 346], [306, 332], [276, 338]], 8, LINE, { in: 0.2, out: 0.3, min: 0.4 });
  // round eyes, small pupils
  for (const [c, rx, ry] of [[[414, 374] as P, 26, 30], [[310, 372] as P, 20, 28]] as const) {
    out += K.shape(K.ellipse(c, rx, ry), '#FFFFFF', LINE, 5);
    out += K.fill(K.ellipse([c[0] - 2, c[1] + 4], rx * 0.36, ry * 0.36), LINE);
    out += K.fill(K.ellipse([c[0] - 6, c[1] - 2], 3.5, 3.5), '#FFFFFF');
  }
  // nose: a round button; cheek line under the eye
  out += K.ink([[346, 410], [336, 424], [348, 430]], 4, LINE, { in: 0.3, out: 0.3 });
  out += K.ink([[440, 414], [452, 424]], 3, LINE);
  // the grin: ear to ear, full of teeth
  const grin = K.blob([[282, 440], [340, 456], [400, 458], [462, 446], [454, 486], [408, 516], [350, 518], [300, 490]], 0.9);
  out += K.shape(grin, '#6A1A22', LINE, 6);
  out += K.clipped(grin, K.fill(K.polyD([[270, 430], [470, 430], [466, 468], [276, 474]]), '#FFFFFF') + K.line('M312 450 v24 M340 456 v22 M370 458 v22 M400 458 v22 M430 454 v22', LINE, 3) + K.fill(K.ellipse([380, 518], 40, 20), '#FF6A7A'));
  out += cel(fr, '#5A3426', 6);
  return out;
}

export function hero(): string {
  const sky = K.linear([[0, '#2A9AFF'], [0.6, '#7FD0FF'], [1, '#D8F2FF']]);
  const glow = K.glowFilter(8, 1.1);
  let bg = `<rect width="800" height="1000" fill="url(#${sky.id})"/>`;
  // big cumulus clouds, drawn with a thick line the way Oda draws them
  const cloud = (cx: number, cy: number, k: number): string => {
    let d = '';
    for (const [dx, dy, r] of [[0, 0, 60], [60, -30, 70], [130, -10, 64], [180, 20, 50], [-60, 20, 50], [60, 30, 60], [120, 36, 56]] as const) d += K.ellipse([cx + dx * k, cy + dy * k], r * k, r * k);
    return K.fill(d, '#FFFFFF');
  };
  bg += cloud(80, 150, 0.9) + cloud(560, 120, 1.1) + cloud(640, 420, 0.7);
  bg += K.fill(K.polyD([[0, 820], [800, 800], [800, 1000], [0, 1000]]), '#1E6ADF') + K.line('M0 820 L800 800', '#FFFFFF', 4);
  for (let i = 0; i < 8; i++) bg += K.line(`M${i * 110 + 20} ${860 + (i % 3) * 30} q20 -12 40 0`, '#FFFFFF', 4);
  // speed burst behind the grin
  bg += K.focusLines([380, 420], 260, 900, 70, 'rgba(255,255,255,.35)', 9, 20);
  const glass = K.fill(K.ellipse([182, 646], 60, 70), '#FFE36A') + K.fill(K.ellipse([182, 650], 24, 34), '#FFFFFF');
  const figure = bodyBack(BODY) + head() + armFront(BODY, glass, '#FFE36A');
  const don = `<text x="520" y="400" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="104" fill="#FFFFFF" stroke="${LINE}" stroke-width="9" paint-order="stroke" transform="rotate(-8 520 400)">DON!</text>`;
  // the soft glow of the no-shadow style
  return K.svg(K.W, K.H, [sky.def, glow.def], bg + `<g filter="url(#${glow.id})">` + figure + `</g>` + don);
}

export function fade(): string {
  const sky = K.linear([[0, '#3A1A6A'], [0.6, '#8A3A9A'], [1, '#FF8A5A']]);
  const glow = K.glowFilter(8, 1.1);
  let out = `<rect width="800" height="1000" fill="url(#${sky.id})"/>`;
  out += K.fill(K.ellipse([600, 180], 90, 90), '#FFE36A');
  out += K.fill(K.polyD([[0, 840], [800, 820], [800, 1000], [0, 1000]]), '#2A1A5A') + K.line('M0 840 L800 820', '#FFD2F0', 4);
  out += K.focusLines([400, 360], 240, 900, 60, 'rgba(255,230,255,.25)', 5, 18);
  // a comedy villain: the hood stretched into a tall point, a grin wider than the mask, jolly menace
  const tallHood = K.blob([[400, 20], [460, 120], [540, 220], [584, 330], [588, 440], [612, 500], [400, 530], [188, 500], [212, 440], [216, 330], [260, 220], [340, 120]], 0.8);
  const cel = (ds: string[], fill: string, w = 8): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  out += `<g filter="url(#${glow.id})">`;
  out += cel([F.robe, tallHood], '#E0304A');
  // Oda-style stripes and a big buckle, because villains in One Piece dress loud
  out += K.clipped(F.robe, K.line('M150 700 H650 M130 800 H670 M110 900 H690', '#FFD23A', 18));
  out += K.shape(K.polyD([[360, 520], [440, 520], [430, 560], [370, 560]]), '#FFD23A', LINE, 4);
  out += K.fill(F.hoodHole, '#2A0A18');
  const mask = K.blob([[400, 220], [470, 236], [504, 300], [506, 380], [478, 450], [400, 474], [322, 450], [294, 380], [296, 300], [330, 236]], 0.9);
  out += K.shape(mask, '#FFFFFF', LINE, 6);
  for (const c of [[356, 320], [444, 320]] as P[]) out += K.shape(K.ellipse(c, 26, 34), '#FFFFFF', LINE, 5) + K.fill(K.ellipse([c[0], c[1] + 8], 8, 10), LINE);
  out += K.ink([[322, 276], [360, 286], [392, 300]], 9, LINE) + K.ink([[478, 276], [440, 286], [408, 300]], 9, LINE);
  const grin = K.blob([[300, 380], [360, 404], [400, 408], [440, 404], [500, 380], [484, 440], [400, 470], [316, 440]], 0.9);
  out += K.shape(grin, '#6A1A22', LINE, 6) + K.clipped(grin, K.fill(K.polyD([[290, 370], [510, 370], [500, 420], [300, 420]]), '#FFFFFF') + K.line('M330 398 v28 M360 404 v26 M390 406 v26 M420 404 v26 M450 400 v26 M478 392 v24', LINE, 3.4));
  out += cel([F.sleeveL, F.sleeveR], '#E0304A', 6);
  out += K.shape(F.handL, '#FFFFFF', LINE, 5) + K.shape(F.handR, '#FFFFFF', LINE, 5);
  out += K.shape(F.candle, '#FFF6D6', LINE, 5) + K.shape(F.flame, '#FFB43A', LINE, 5);
  out += `</g>`;
  out += `<text x="40" y="170" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="92" fill="#FFFFFF" stroke="${LINE}" stroke-width="9" paint-order="stroke" transform="rotate(-10 40 170)">MUHAHA!</text>`;
  return K.svg(K.W, K.H, [sky.def, glow.def], out);
}
