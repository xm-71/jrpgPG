// Look 3: Demon Slayer. ufotable's heavy, confident outline and Gotouge's angular hair; big eyes with
// banded, glowing irises; Taisho-era costume patterns laid flat over the cloth; and breathing techniques
// drawn like ukiyo-e woodblock prints: flat colour, dark outlines, curling tongues and foam claws.
import * as K from '../lib.ts';
import * as F from '../fade.ts';
import { armFront, bodyBack, type BodyStyle } from '../bodykit.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#1C0E12';

function asanoha(color: string, bg: string, size = 36): { id: string; def: string } {
  // Hemp-leaf pattern: six-pointed stars in a triangular grid.
  const id = `asanoha${size}`;
  const h = size * Math.sqrt(3);
  const s = size;
  const lines = [
    `M0 0 L${s} ${h / 3}`, `M${s * 2} 0 L${s} ${h / 3}`, `M${s} ${h} L${s} ${h / 3}`,
    `M0 0 L${s * 2} 0`, `M0 0 L${s} ${h}`, `M${s * 2} 0 L${s} ${h}`,
    `M${s} ${h} L0 ${h * 4 / 3}`, `M${s} ${h} L${s * 2} ${h * 4 / 3}`, `M${s} ${h} L${s} ${h * 2}`,
    `M0 ${h * 2} L${s} ${h}`, `M${s * 2} ${h * 2} L${s} ${h}`,
    `M0 0 L0 ${h * 2}`, `M${s * 2} 0 L${s * 2} ${h * 2}`,
  ].join(' ');
  return {
    id,
    def: `<pattern id="${id}" width="${s * 2}" height="${h * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><rect width="${s * 2}" height="${h * 2}" fill="${bg}"/><path d="${lines}" stroke="${color}" stroke-width="2.2" fill="none"/></pattern>`,
  };
}

const BODY = (scarfPat: string): BodyStyle => ({
  line: LINE, lw: 4,
  skin: '#F6D2B4', skinS: '#DDA286',
  jacket: '#20182A', jacketS: '#0E0A14', jacketH: '#3A2E4E',
  under: '#F2E8D6', underS: '#CDBEA4',
  scarf: '#E84C82', scarfS: '#A32A5C', scarfH: '#FF9BBE',
  glove: '#2A2026', gloveS: '#140E12',
  brass: '#D8A84E', brassS: '#8E6426',
  strap: '#5A3A2A', strapS: '#38241A',
  scarfPattern: `url(#${scarfPat})`,
});

const face = K.blob(
  [[300, 246], [274, 300], [270, 350], [276, 376], [272, 408], [290, 452], [320, 488], [348, 504], [376, 500], [420, 482], [458, 454], [484, 418], [494, 378], [498, 300], [462, 232], [380, 214]],
  0.75,
);

function head(hairGrad: string): string {
  const cel = (ds: string[], fill: string, w = 9): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  const mass = K.blob([[262, 330], [254, 250], [300, 176], [396, 150], [494, 184], [530, 266], [514, 350], [470, 300], [380, 280], [300, 300]], 0.8);
  // Gotouge's hair: angular clumps, some split into two points
  const spikes: Array<[P, P, number, number]> = [
    [[292, 214], [170, 150], 96, 0.08], [[330, 186], [250, 70], 90, 0.14], [[380, 170], [372, 36], 96, 0.02], [[432, 170], [500, 50], 92, -0.1],
    [[482, 196], [616, 118], 96, -0.1], [[512, 252], [660, 250], 86, -0.06], [[512, 320], [620, 380], 66, -0.04], [[266, 262], [160, 280], 72, 0.1],
  ];
  const sp = spikes.map(([r, t, w, b]) => spike(r, t, w, b));
  const fringe: Array<[P, P, number, number]> = [
    [[296, 262], [262, 358], 58, 0.12], [[332, 252], [306, 382], 66, 0.14], [[372, 248], [352, 360], 56, 0.08], [[408, 248], [404, 372], 60, 0.02],
    [[446, 254], [468, 346], 52, -0.12], [[484, 276], [508, 356], 44, -0.14],
  ];
  const fr = fringe.map(([r, t, w, b]) => spike(r, t, w, b));
  const ear = K.blob([[486, 360], [512, 350], [526, 378], [520, 420], [498, 440], [484, 426]], 0.8);
  let out = '';
  out += cel([mass, ...sp], `url(#${hairGrad})`);
  // broken, segmented inner lines along each clump (the "broken lines" of the manga)
  for (const [r, t] of spikes) {
    const a = K.lerp(r, t, 0.2);
    const b = K.lerp(r, t, 0.55);
    const c2 = K.lerp(r, t, 0.62);
    const d2 = K.lerp(r, t, 0.8);
    out += K.ink([a, b], 3.4, LINE, { in: 0.2, out: 0.3 }) + K.ink([c2, d2], 3, LINE, { in: 0.3, out: 0.5 });
  }
  out += K.clipped([mass, ...sp].join(''), K.fill(K.polyD([[420, 120], [700, 120], [700, 420], [360, 420], [420, 300]]), 'rgba(20,6,10,.45)'));
  out += cel([ear, face], '#F6D2B4');
  out += K.clipped(ear, K.fill(K.blob([[500, 370], [516, 380], [510, 414], [496, 420]]), '#DDA286')) + K.ink([[500, 372], [512, 386], [506, 410]], 3.4, LINE);
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), '#5A2E24');
  const shade = K.polyD([[462, 300], [540, 300], [540, 540], [372, 540], [420, 496], [452, 462], [466, 424], [458, 390], [476, 350]]);
  const fringeShade = K.polyD([[270, 300], [540, 300], [540, 358], [508, 366], [488, 332], [466, 350], [446, 330], [406, 380], [392, 340], [352, 388], [332, 350], [296, 372], [270, 364]]);
  out += K.clipped(face, K.fill(shade, '#DDA286') + K.fill(fringeShade, '#DDA286') + K.fill(K.ellipse([300, 440], 24, 12), 'rgba(240,120,120,.35)') + K.fill(K.ellipse([446, 446], 18, 10), 'rgba(240,120,120,.3)'));
  // brows: soft, earnest, slightly lifted
  out += K.ink([[384, 356], [414, 344], [450, 344]], 7, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  out += K.ink([[344, 360], [312, 350], [288, 352]], 6, LINE, { in: 0.2, out: 0.5, min: 0.3 });
  // big eyes with banded irises and a lit rim
  const eyeN = K.blob([[380, 384], [406, 364], [444, 362], [454, 386], [440, 412], [398, 414]], 0.7);
  const eyeF = K.blob([[288, 378], [310, 366], [338, 376], [338, 402], [310, 410], [292, 398]], 0.7);
  const irisN = K.radial([[0, '#FFF1B8'], [0.35, '#F2B54A'], [0.7, '#C8561E'], [1, '#5A1A10']], 0.5, 0.62, 0.62);
  const irisF = K.radial([[0, '#FFF1B8'], [0.35, '#F2B54A'], [0.7, '#C8561E'], [1, '#5A1A10']], 0.5, 0.62, 0.62);
  out += `<defs>${irisN.def}${irisF.def}</defs>`;
  for (const [eye, c, rx, ry, g] of [[eyeN, [414, 390] as P, 20, 24, irisN.id], [eyeF, [316, 390] as P, 14, 20, irisF.id]] as const) {
    out += K.fill(eye, '#FFFFFF');
    out += K.clipped(eye, K.fill(K.ellipse(c, rx, ry), `url(#${g})`) + K.line(K.ellipse(c, rx * 0.72, ry * 0.72), '#7A2A14', 1.6) + K.fill(K.ellipse([c[0], c[1] + 2], rx * 0.36, ry * 0.42), LINE) + K.fill(K.ellipse([c[0] - rx * 0.35, c[1] - ry * 0.4], rx * 0.28, rx * 0.24), '#FFFFFF') + K.fill(K.ellipse([c[0] + rx * 0.35, c[1] + ry * 0.4], rx * 0.14, rx * 0.12), '#FFFFFF') + K.fill(K.polyD([[c[0] - 50, c[1] - 40], [c[0] + 50, c[1] - 40], [c[0] + 50, c[1] - ry * 0.55], [c[0] - 50, c[1] - ry * 0.7]]), 'rgba(60,20,30,.25)'));
  }
  // lashes: a thick upper line with three points at the outer corner
  out += K.ink([[376, 388], [392, 368], [420, 360], [448, 362], [460, 376]], 9, LINE, { in: 0.15, out: 0.05, min: 0.5 });
  out += K.fill(K.polyD([[452, 364], [472, 356], [460, 372]]), LINE) + K.fill(K.polyD([[456, 374], [474, 378], [458, 382]]), LINE);
  out += K.ink([[402, 416], [428, 416], [446, 406]], 3, LINE, { in: 0.4, out: 0.4 });
  out += K.ink([[342, 384], [324, 368], [300, 368], [284, 380]], 7.5, LINE, { in: 0.15, out: 0.15, min: 0.5 });
  out += K.fill(K.polyD([[284, 378], [272, 370], [282, 386]]), LINE);
  out += K.ink([[296, 406], [316, 410], [332, 404]], 2.6, LINE, { in: 0.4, out: 0.4 });
  // nose and a determined, open mouth
  out += K.ink([[350, 410], [340, 432], [350, 436]], 3, LINE, { in: 0.4, out: 0.2 });
  const mouth = K.blob([[330, 460], [360, 456], [384, 460], [370, 474], [346, 476]], 0.8);
  out += K.shape(mouth, '#7A2230', LINE, 3.5) + K.clipped(mouth, K.fill(K.ellipse([356, 478], 16, 8), '#D8606E'));
  out += cel(fr, `url(#${hairGrad})`, 8);
  for (const [r, t] of fringe) out += K.ink([K.lerp(r, t, 0.25), K.lerp(r, t, 0.6)], 3, LINE, { in: 0.2, out: 0.4 });
  return out;
}

/** A breathing technique as an ukiyo-e print: flat flame tongues with curled tips and dark outlines. */
function ukiyoeFire(c: P, seed: number, scale = 1): string {
  const rnd = K.seeded(seed);
  let out = '';
  const tongue = (root: P, dir: number, len: number, w: number, fillC: string): string => {
    // a flame tongue that curls at the tip
    const pts: P[] = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = dir + Math.sin(t * Math.PI * 1.1) * 0.9;
      pts.push([root[0] + Math.cos(a) * len * t, root[1] + Math.sin(a) * len * t]);
    }
    const d = K.brush(pts, w, { in: 0.05, out: 0.9, min: 0.05 });
    return K.shape(d, fillC, LINE, 4 * scale);
  };
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (0.55 + rnd() * 0.9);
    const r = (60 + rnd() * 120) * scale;
    const root: P = [c[0] + Math.cos(a) * r * 0.4, c[1] + Math.sin(a) * r * 0.4];
    const dir = a + 0.7;
    out += tongue(root, dir, (140 + rnd() * 140) * scale, (38 + rnd() * 26) * scale, i % 3 === 0 ? '#FFD35A' : i % 3 === 1 ? '#F2762E' : '#D8322A');
  }
  return out;
}

export function hero(): string {
  const pat = asanoha('#FFE2EC', 'none', 20);
  const night = K.linear([[0, '#0A0C24'], [0.6, '#1E1A48'], [1, '#3A1E4A']]);
  const hairGrad = K.linear([[0, '#3A1C16'], [0.6, '#5A2A1E'], [1, '#B0402A']], 0, 1, 0, 0);
  const moonGlow = K.radial([[0, '#FFF6DE', 1], [0.55, '#FFE9B8', 0.9], [0.62, '#F6D59A', 0.25], [1, '#F6D59A', 0]]);
  let bg = `<rect width="800" height="1000" fill="url(#${night.id})"/>`;
  bg += K.fill(K.ellipse([560, 250], 260, 260), `url(#${moonGlow.id})`);
  // wisteria hanging from the top edge
  const rnd = K.seeded(5);
  for (let i = 0; i < 12; i++) {
    const x = i * 72 + rnd() * 30;
    const len = 80 + rnd() * 160;
    for (let j = 0; j < 9; j++) {
      const y = j * (len / 9);
      const r = 12 - j * 1.1;
      bg += K.fill(K.ellipse([x + Math.sin(j) * 5, y], r, r * 0.8), j % 2 ? '#B89AE6' : '#9A72D6', `opacity="${0.9 - j * 0.06}"`);
    }
  }
  // falling petals
  for (let i = 0; i < 30; i++) bg += K.fill(K.ellipse([rnd() * 800, 200 + rnd() * 800], 5, 3), '#C8B0F0', `opacity=".7" transform="rotate(${rnd() * 180} 0 0)"`);
  const lanternGlass = K.fill(K.ellipse([182, 646], 60, 70), '#FFD35A') + K.fill(K.ellipse([182, 650], 26, 36), '#FFFFFF');
  const st = BODY(pat.id);
  const figure = bodyBack(st) + head(hairGrad.id) + armFront(st, lanternGlass);
  const fire = ukiyoeFire([150, 700], 3, 0.85);
  const body = bg + `<g opacity=".95">` + ukiyoeFire([620, 820], 9, 0.9) + `</g>` + figure + fire;
  return K.svg(K.W, K.H, [pat.def, night.def, hairGrad.def, moonGlow.def], body);
}

export function fade(): string {
  // A demon: the mask cracked open on slit eyes and fangs, horns through the hood, veins, a patterned
  // kimono under the robe, and red spider lilies under a blood moon.
  const night = K.linear([[0, '#08060E'], [0.6, '#1A0A18'], [1, '#3A0A16']]);
  const moon = K.radial([[0, '#FF6A5A', 1], [0.55, '#E0302E', 0.95], [0.62, '#A01A20', 0.3], [1, '#A01A20', 0]]);
  const waves = seigaiha('#E9DFC8', '#5A1422');
  let out = `<rect width="800" height="1000" fill="url(#${night.id})"/>`;
  out += K.fill(K.ellipse([400, 300], 300, 300), `url(#${moon.id})`);
  // spider lilies along the bottom
  const rnd = K.seeded(8);
  for (let i = 0; i < 9; i++) {
    const c: P = [40 + i * 92 + rnd() * 20, 900 + rnd() * 70];
    let petals = '';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.45;
      const tip: P = [c[0] + Math.cos(a) * 60, c[1] + Math.sin(a) * 60];
      petals += K.curve([c, K.lerp(c, tip, 0.5), [tip[0] + Math.cos(a + 1.4) * 14, tip[1] + Math.sin(a + 1.4) * 14]]) + ' ';
    }
    out += K.line(`M${c[0]} ${c[1]} v120`, '#2A5A2A', 5) + K.line(petals, '#E0182E', 4.5);
  }
  const cel = (ds: string[], fill: string, w = 10): string => ds.map((d) => K.shape(d, 'none', LINE, w)).join('') + ds.map((d) => K.fill(d, fill)).join('');
  out += cel([F.robe, F.hoodOuter], '#3A1C2E');
  // the kimono pattern on the robe front
  out += K.clipped(F.robe, `<rect x="0" y="0" width="800" height="1000" fill="url(#${waves.id})" opacity=".9"/>` + K.fill(K.polyD([[0, 480], [260, 480], [220, 1010], [0, 1010]]), '#3A1C2E') + K.fill(K.polyD([[540, 480], [800, 480], [800, 1010], [580, 1010]]), '#3A1C2E'));
  out += K.ink([[260, 520], [236, 760], [220, 1000]], 6, LINE) + K.ink([[540, 520], [566, 760], [580, 1000]], 6, LINE);
  out += K.clipped(F.hoodOuter, K.fill(K.polyD([[470, 90], [620, 90], [620, 540], [520, 540], [540, 380]]), '#1E0C18'));
  // horns through the hood
  for (const [r, t] of [[[330, 150], [250, 20]], [[470, 150], [556, 20]]] as Array<[P, P]>) out += K.shape(spike(r, t, 46, 0.2), '#E8DCC4', LINE, 5);
  out += K.fill(F.hoodHole, '#0A0508');
  // the mask, cracked: half of it has fallen away onto the demon's face
  out += K.shape(F.mask, '#F2EEE4', LINE, 6);
  const broken = K.polyD([[400, 232], [404, 280], [390, 320], [410, 360], [396, 400], [404, 458], [470, 432], [492, 370], [488, 300], [456, 246]]);
  out += K.shape(broken, '#D8B0A8', LINE, 5);
  // veins over the bare half
  out += K.clipped(broken, K.line('M420 260 q20 20 10 50 q-8 30 20 50 M470 300 q-20 30 -4 60 M440 400 q20 10 30 30', '#8E1A2A', 3));
  // eyes: the mask's painted eye, and a demon's slit eye on the bare side
  out += K.fill(K.ellipse(F.eyeL, 18, 8), LINE);
  const demonEye = K.blob([[410, 336], [438, 322], [470, 330], [460, 348], [430, 352]], 0.7);
  out += K.shape(demonEye, '#F6E24A', LINE, 4) + K.clipped(demonEye, K.fill(K.ellipse([438, 337], 4, 14), LINE));
  // fangs in the smile
  out += K.shape(F.smile, '#5A0A14', LINE, 4) + K.clipped(F.smile, K.fill(K.polyD([[350, 390], [362, 412], [372, 394]]), '#FFFFFF') + K.fill(K.polyD([[428, 394], [440, 414], [450, 390]]), '#FFFFFF'));
  // clawed hands and the candle, burning demon-red
  out += K.shape(F.sleeveL, '#3A1C2E', LINE, 7) + K.shape(F.sleeveR, '#3A1C2E', LINE, 7);
  out += K.shape(F.handL, '#D8B0A8', LINE, 4) + K.shape(F.handR, '#D8B0A8', LINE, 4);
  out += K.line('M356 646 l-18 -4 M356 666 l-20 4 M444 646 l18 -4 M444 666 l20 4', LINE, 4);
  out += K.shape(F.candle, '#F2E8D8', LINE, 4) + K.fill(F.drip, '#FFFFFF');
  out += ukiyoeFireSmall([400, 520]);
  return K.svg(K.W, K.H, [night.def, moon.def, waves.def], out);

  function ukiyoeFireSmall(c: P): string {
    let s = '';
    const tongues: Array<[number, number, string]> = [[-1.9, 90, '#E0182E'], [-1.4, 120, '#FF5A3A'], [-1.1, 80, '#E0182E'], [-1.6, 60, '#FFD35A']];
    for (const [a, len, col] of tongues) {
      const pts: P[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const aa = a + Math.sin(t * Math.PI) * 0.8;
        pts.push([c[0] + Math.cos(aa) * len * t, c[1] + 30 + Math.sin(aa) * len * t]);
      }
      s += K.shape(K.brush(pts, 34, { in: 0.05, out: 0.9, min: 0.05 }), col, LINE, 4);
    }
    return s;
  }
}

function seigaiha(line: string, bg: string): { id: string; def: string } {
  const id = 'seigaiha';
  const r = 30;
  const arcs = (cx: number, cy: number): string => [r, r * 0.72, r * 0.44, r * 0.18].map((rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${bg}" stroke="${line}" stroke-width="2.4"/>`).join('');
  return {
    id,
    def: `<pattern id="${id}" width="${r * 2}" height="${r}" patternUnits="userSpaceOnUse"><rect width="${r * 2}" height="${r}" fill="${bg}"/>${arcs(0, r)}${arcs(r * 2, r)}${arcs(r, r * 1.5)}${arcs(r, r * 0.5)}</pattern>`,
  };
}
