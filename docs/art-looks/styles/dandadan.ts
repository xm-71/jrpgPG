// Look 6: Dandadan. Tatsu's dense, loose, hatched ink and Science SARU's colour: saturated neon pinks,
// cyans and acid yellows over dark ground, halftone dots, 70s psychedelic bands, occult and alien
// mixed together, expressions pushed to the edge, and a wobbling psychic aura around the body.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#150A1A';
const BODY = (dotsId: string): BodyStyle => ({
  line: LINE, lw: 2.6,
  skin: '#FFD7BE', skinS: '#E88E9A',
  jacket: '#3A1E6A', jacketS: '#1E0C3E', jacketH: '#6A3AB0',
  under: '#FFF6D6', underS: '#F2B8C8',
  scarf: '#FF3C9A', scarfS: '#B8126A', scarfH: '#FFA2D2',
  glove: '#2A1636', gloveS: '#140A1C',
  brass: '#FFD43A', brassS: '#D8841A',
  strap: '#5A2A1A', strapS: '#2E140C',
  jacketPattern: `url(#${dotsId})`,
});

const face = K.blob(
  [[300, 246], [274, 300], [270, 350], [276, 374], [272, 406], [290, 452], [320, 490], [346, 508], [376, 504], [420, 484], [460, 452], [484, 416], [494, 378], [498, 300], [462, 232], [380, 214]],
  0.7,
);

function hatch(x0: number, y0: number, x1: number, y1: number, gap: number, angle: number, w = 1.4): string {
  let d = '';
  const dx = Math.cos(angle) * 400;
  const dy = Math.sin(angle) * 400;
  for (let x = x0 - 400; x < x1 + 400; x += gap) d += `M${x} ${y0 - 20}l${dx.toFixed(0)} ${dy.toFixed(0)}`;
  return K.line(d, LINE, w);
}

function head(): string {
  const cel = (ds: string[], fill: string, w = 5): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  const rnd = K.seeded(71);
  const clumps: Array<[P, P, number, number]> = [];
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (1.0 + (i / 11) * 1.0) + (rnd() - 0.5) * 0.1;
    const root: P = [392 + Math.cos(a) * 118, 296 + Math.sin(a) * 124];
    const len = 80 + rnd() * 90;
    const b = (rnd() - 0.5) * 0.8;
    clumps.push([root, [root[0] + Math.cos(a + b * 0.4) * len, root[1] + Math.sin(a + b * 0.4) * len], 60 + rnd() * 30, b * 0.5]);
  }
  const mass = K.blob([[262, 330], [254, 250], [300, 176], [396, 150], [494, 184], [530, 266], [514, 350], [470, 300], [380, 280], [300, 300]], 0.8);
  const sp = clumps.map(([r, t, w, b]) => spike(r, t, w, b));
  const fringe: Array<[P, P, number, number]> = [[[298, 262], [260, 356], 56, 0.2], [[336, 250], [318, 376], 60, 0.1], [[380, 246], [370, 362], 56, 0.02], [[424, 248], [446, 350], 54, -0.14], [[466, 262], [500, 348], 46, -0.2]];
  const fr = fringe.map(([r, t, w, b]) => spike(r, t, w, b));
  const ear = K.blob([[486, 360], [512, 350], [526, 378], [520, 420], [498, 440], [484, 426]], 0.8);
  let out = cel([mass, ...sp], '#5A2E2A');
  // dense hatching for the hair's shadow side, the way the manga fills it
  out += K.clipped([mass, ...sp].join(''), K.clipped(K.polyD([[380, 100], [720, 60], [720, 420], [320, 420], [420, 300]]), hatch(300, 60, 720, 440, 5, 2.2, 1.6)) + K.fill(K.polyD([[480, 200], [720, 160], [720, 420], [470, 400]]), 'rgba(20,6,20,.55)'));
  // neon rim from the background
  out += K.clipped([mass, ...sp].join(''), K.ink([[250, 300], [240, 230], [290, 150]], 12, '#39F2FF', { in: 0.3, out: 0.5 }));
  out += cel([ear, face], '#FFD7BE');
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), '#5A2E2A');
  out += K.clipped(face, K.fill(K.polyD([[456, 300], [540, 300], [540, 540], [372, 540], [420, 496], [454, 460], [468, 420], [460, 386], [476, 346]]), '#F2A4AE') + K.clipped(K.polyD([[456, 300], [540, 300], [540, 540], [372, 540], [420, 496], [454, 460], [468, 420], [460, 386], [476, 346]]), hatch(360, 300, 540, 540, 6, 2.3, 1.3)));
  // blush hatching and a sweat drop: pushed expression
  out += K.clipped(face, K.line('M292 430 l12 -14 M302 432 l12 -14 M312 434 l12 -14 M436 440 l12 -14 M446 442 l12 -14', '#D8304A', 2.2));
  out += K.shape(K.blob([[520, 300], [532, 330], [524, 350], [512, 344], [510, 322]], 0.8), '#B8F8FF', LINE, 2.4);
  // brows shot up in shock-excitement
  out += K.ink([[386, 336], [418, 318], [454, 320]], 7, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  out += K.ink([[344, 342], [314, 326], [288, 330]], 6, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  // big round eyes, tiny shaking pupils, extra highlight rings
  const eyeN = K.blob([[382, 380], [410, 352], [446, 356], [456, 386], [438, 414], [398, 414]], 0.9);
  const eyeF = K.blob([[290, 376], [312, 354], [338, 366], [340, 396], [312, 408], [292, 396]], 0.9);
  for (const [eye, c, r] of [[eyeN, [418, 386] as P, 13], [eyeF, [318, 384] as P, 10]] as const) {
    out += K.shape(eye, '#FFFFFF', LINE, 4.5);
    out += K.clipped(eye, K.line(K.ellipse(c, r, r), LINE, 2.6) + K.fill(K.ellipse(c, r * 0.35, r * 0.35), LINE) + K.line(K.ellipse(c, r * 1.6, r * 1.6), '#39F2FF', 1.6));
  }
  out += K.line('M412 360 l-6 -8 M424 356 l0 -10 M436 360 l6 -8', LINE, 2.2);
  // nose and a huge open mouth
  out += K.ink([[350, 408], [338, 430], [350, 436]], 3, LINE, { in: 0.4, out: 0.2 });
  const mouth = K.blob([[316, 452], [360, 446], [396, 452], [384, 486], [352, 500], [326, 484]], 0.8);
  out += K.shape(mouth, '#5A0A20', LINE, 4) + K.clipped(mouth, K.fill(K.polyD([[310, 440], [400, 440], [396, 458], [314, 460]]), '#FFFFFF') + K.fill(K.ellipse([356, 496], 26, 14), '#FF6A8A'));
  out += cel(fr, '#5A2E2A', 4.5);
  out += K.clipped(fr.join(''), hatch(250, 250, 520, 380, 6, 2.0, 1.4));
  return out;
}

export function hero(): string {
  const dots = K.dots('rgba(255,90,200,.35)', 9, 2.4);
  const bands: string[] = ['#FF2E88', '#FFB41E', '#2EF0C8', '#3A7CFF', '#A83CFF', '#FF2E88', '#FFE23A', '#2A1050'];
  let bg = `<rect width="800" height="1000" fill="#1A0A2E"/>`;
  // 70s psychedelic bands swirling out from behind the head
  bands.forEach((col, i) => {
    const r = 760 - i * 90;
    let d = '';
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const rr = r + Math.sin(a * 7 + i) * 26;
      d += `${k === 0 ? 'M' : 'L'}${(430 + Math.cos(a) * rr).toFixed(1)} ${(330 + Math.sin(a) * rr).toFixed(1)}`;
    }
    bg += K.fill(d + 'Z', col);
  });
  const halftone = K.dots('#150A1A', 12, 3.4, 30);
  bg += `<rect width="800" height="1000" fill="url(#${halftone.id})" opacity=".35"/>`;
  // a flying saucer and a yokai ghost-fire, because in Dandadan they share the sky
  bg += K.shape(K.ellipse([640, 130], 90, 22), '#C8D4E0', LINE, 4) + K.shape(K.blob([[590, 124], [620, 90], [660, 90], [690, 124]], 0.7), '#8AF8FF', LINE, 4);
  bg += `<path d="M600 150 L540 420 L760 420 L680 150Z" fill="#E8FF6A" opacity=".35"/>`;
  bg += K.shape(K.blob([[90, 180], [120, 130], [110, 90], [140, 120], [150, 170], [120, 200]], 0.8), '#6AF0FF', LINE, 3);
  // the psychic aura: the silhouette traced again and again in wobbling neon
  const rough = K.roughFilter(12, 0.02, 7);
  const sil = K.blob([[110, 1000], [96, 740], [130, 560], [200, 440], [250, 250], [320, 150], [430, 120], [540, 180], [600, 300], [600, 520], [700, 640], [740, 1000]], 0.8);
  const aura = `<g filter="url(#${rough.id})">` + K.line(sil, '#39F2FF', 26, 'opacity=".55"') + K.line(sil, '#FFFFFF', 6) + K.line(sil, '#FF3C9A', 3, 'transform="translate(10 -12)"') + `</g>`;
  const glass = K.fill(K.ellipse([182, 646], 60, 70), '#FFF26A') + K.fill(K.ellipse([182, 650], 24, 34), '#FFFFFF');
  const figure = bodyBack(BODY(dots.id)) + head() + armFront(BODY(dots.id), glass, '#FFF26A');
  const sfx = `<text x="440" y="930" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="92" fill="#FFE23A" stroke="${LINE}" stroke-width="7" paint-order="stroke" transform="rotate(-12 440 930)">DOOM!</text>`;
  return K.svg(K.W, K.H, [dots.def, halftone.def, rough.def], bg + aura + figure + sfx);
}

export function fade(): string {
  const dots = K.dots('rgba(20,10,26,.35)', 10, 2.6, 30);
  const rough = K.roughFilter(10, 0.03, 3);
  let out = `<rect width="800" height="1000" fill="#0E1A12"/>`;
  // acid-green and magenta lighting, a UFO beam from above
  out += `<path d="M300 0 L500 0 L720 1000 L80 1000Z" fill="#B8FF3A" opacity=".28"/>`;
  out += K.fill(K.ellipse([400, 300], 330, 330), '#FF2E88', 'opacity=".55"');
  out += `<rect width="800" height="1000" fill="url(#${dots.id})"/>`;
  const cel = (ds: string[], fill: string, w = 5): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  out += cel([F.robe, F.hoodOuter], '#3A2A5A');
  // dense crosshatching in the robe's folds
  const hat = (d: string, a: number, gap: number): string => K.clipped(d, hatch(0, 400, 800, 1000, gap, a, 1.3));
  out += K.clipped(F.robe, hat(K.polyD([[420, 480], [720, 480], [720, 1010], [460, 1010]]), 2.1, 6) + hat(K.polyD([[500, 600], [720, 600], [720, 1010], [520, 1010]]), 1.1, 6) + hat(K.polyD([[100, 700], [240, 640], [220, 1010], [100, 1010]]), 2.1, 6));
  out += K.clipped(F.hoodOuter, hat(K.polyD([[460, 90], [620, 90], [620, 540], [520, 540]]), 2.1, 6));
  out += K.shape(F.sleeveL, '#3A2A5A', LINE, 4) + K.shape(F.sleeveR, '#3A2A5A', LINE, 4);
  out += K.fill(F.hoodHole, '#0A0610');
  // the mask stretched into a grin too wide for it, bulging bloodshot eyes
  const bigMask = K.blob([[400, 226], [462, 242], [500, 300], [506, 380], [480, 450], [400, 476], [320, 450], [294, 380], [300, 300], [338, 242]], 0.9);
  out += K.shape(bigMask, '#F6F0DC', LINE, 5);
  out += K.clipped(bigMask, hatch(420, 230, 520, 480, 5, 2.2, 1.2));
  for (const c of [[360, 330], [440, 330]] as P[]) {
    out += K.shape(K.ellipse(c, 30, 30), '#FFFFFF', LINE, 4);
    out += K.line(`M${c[0] - 26} ${c[1] - 8}q10 4 14 -2 M${c[0] + 24} ${c[1] + 10}q-10 -2 -14 4 M${c[0] - 6} ${c[1] + 26}q2 -8 8 -10`, '#E0182E', 2);
    out += K.fill(K.ellipse([c[0] + 4, c[1] + 2], 8, 8), LINE);
  }
  const grin = K.blob([[312, 384], [360, 402], [400, 406], [440, 402], [488, 384], [476, 430], [400, 452], [324, 430]], 0.8);
  out += K.shape(grin, '#2A0A14', LINE, 5) + K.clipped(grin, K.line('M320 396 V440 M336 400 V446 M352 402 V450 M368 404 V452 M384 405 V454 M400 405 V454 M416 405 V454 M432 404 V452 M448 402 V450 M464 400 V446 M480 396 V440', '#FFFBE6', 7) + K.line('M300 424 H500', LINE, 3));
  out += K.shape(F.handL, '#C8F0B8', LINE, 4) + K.shape(F.handR, '#C8F0B8', LINE, 4);
  out += K.line('M356 640 l-24 -20 M354 660 l-30 -6 M356 680 l-26 10 M444 640 l24 -20 M446 660 l30 -6 M444 680 l26 10', LINE, 4);
  out += K.shape(F.candle, '#FFF6D6', LINE, 4);
  out += `<g filter="url(#${rough.id})">` + K.shape(F.flame, '#B8FF3A', LINE, 4) + `</g>`;
  out += `<text x="70" y="170" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="84" fill="#B8FF3A" stroke="${LINE}" stroke-width="7" paint-order="stroke" transform="rotate(-10 70 170)">HEE HEE</text>`;
  return K.svg(K.W, K.H, [dots.def, rough.def], out);
}
