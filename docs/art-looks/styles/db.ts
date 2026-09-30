// Look 1: Dragon Ball. Toriyama's clean, confident line at an even weight, big spiked hair clumps, fierce
// angular eyes under heavy brows, two-tone cel shading with hard edges, and a golden aura with rising
// debris. Toei's power-up language: the aura, speed streaks, and floating rocks.
import * as K from '../lib.ts';
import * as Pz from '../pose.ts';
import { spike, type P } from '../lib.ts';

const LINE = '#1B0F12';
const C = {
  skin: '#F4CBA6', skinS: '#D99C7C', skinH: '#FFE6CF',
  hair: '#4E2F24', hairS: '#2A1611', hairH: '#8A5A45',
  eye: '#E8A23A', eyeS: '#9A5A12',
  jacket: '#3D2656', jacketS: '#231437', jacketH: '#5A3D7A',
  under: '#F3EAD6', underS: '#CDBEA2',
  scarf: '#EC4A83', scarfS: '#A82B5E', scarfH: '#FF94B8',
  glove: '#3E2B33', gloveS: '#231820',
  brass: '#D6A64E', brassS: '#8F6424',
  mouth: '#6A1B25', teeth: '#FFFFFF',
};

/** Outline-then-fill: every part gets the outer line, inner overlaps disappear. */
function cel(parts: Array<{ d: string; fill: string }>, w: number): string {
  return parts.map((p) => K.shape(p.d, 'none', LINE, w * 2)).join('') + parts.map((p) => K.fill(p.d, p.fill)).join('');
}

function hairSpikes(): Array<{ root: P; tip: P; w: number; bow?: number }> {
  return [
    { root: [300, 210], tip: [178, 118], w: 110, bow: 0.1 },
    { root: [350, 180], tip: [292, 34], w: 120, bow: 0.18 },
    { root: [420, 170], tip: [452, 22], w: 118, bow: -0.05 },
    { root: [480, 190], tip: [604, 78], w: 118, bow: -0.12 },
    { root: [512, 250], tip: [664, 210], w: 100, bow: -0.1 },
    { root: [516, 318], tip: [640, 356], w: 80, bow: -0.05 },
    { root: [272, 262], tip: [158, 244], w: 84, bow: 0.12 },
  ];
}
function bangs(): Array<{ root: P; tip: P; w: number; bow?: number }> {
  return [
    { root: [300, 262], tip: [262, 352], w: 64, bow: 0.1 },
    { root: [340, 250], tip: [312, 372], w: 80, bow: 0.12 },
    { root: [392, 246], tip: [384, 354], w: 78, bow: 0.05 },
    { root: [440, 250], tip: [460, 338], w: 66, bow: -0.1 },
    { root: [484, 272], tip: [506, 352], w: 54, bow: -0.12 },
  ];
}

const face = K.blob(
  [
    [300, 246], [272, 300], [270, 350], [277, 372], [270, 404], [288, 452], [318, 490], [342, 510], [372, 506], [420, 486], [462, 456], [486, 418], [494, 378], [498, 300], [462, 232], [380, 214],
  ],
  0.55,
);

function head(): string {
  const hairMass = K.blob([[262, 330], [252, 250], [300, 170], [400, 146], [500, 186], [532, 270], [514, 352], [470, 300], [380, 280], [300, 300]], 0.8);
  const spikes = hairSpikes().map((s) => spike(s.root, s.tip, s.w, s.bow ?? 0.15));
  const bang = bangs().map((s) => spike(s.root, s.tip, s.w, s.bow ?? 0.15));
  const ear = K.blob([[486, 360], [512, 350], [526, 378], [520, 420], [498, 440], [484, 426]], 0.8);

  // Back hair (behind face), then face, then bangs on top.
  let out = '';
  out += cel([{ d: hairMass, fill: C.hair }, ...spikes.map((d) => ({ d, fill: C.hair }))], 3);
  // hair shading: shadow side of each spike, and highlight streaks
  const shade = hairSpikes()
    .map((s) => {
      const dir = K.unit(K.sub(s.tip, s.root));
      const n = K.perp(dir);
      const r2 = K.add(s.root, K.mul(n, -s.w * 0.22));
      return spike(r2, K.lerp(s.tip, r2, 0.04), s.w * 0.48, s.bow ?? 0.15);
    })
    .map((d) => K.fill(d, C.hairS))
    .join('');
  out += K.clipped([hairMass, ...spikes].join(''), shade + K.fill(K.blob([[300, 300], [520, 300], [520, 360], [300, 360]]), C.hairS));
  out += K.clipped(
    [hairMass, ...spikes].join(''),
    [
      K.ink([[330, 150], [370, 110], [396, 60]], 16, C.hairH, { in: 0.5, out: 0.5 }),
      K.ink([[430, 150], [444, 100], [448, 60]], 14, C.hairH, { in: 0.5, out: 0.5 }),
      K.ink([[500, 170], [540, 140], [580, 104]], 14, C.hairH, { in: 0.5, out: 0.5 }),
      K.ink([[300, 190], [250, 160], [206, 132]], 12, C.hairH, { in: 0.5, out: 0.5 }),
    ].join(''),
  );
  // strand lines inside the clumps
  for (const st of [[[330, 190], [300, 120]], [[410, 180], [420, 90]], [[470, 200], [540, 130]], [[500, 250], [590, 230]], [[300, 240], [220, 220]]] as P[][]) out += K.ink(st, 3.5, LINE, { in: 0.2, out: 0.6 });
  // ear + face
  out += cel([{ d: ear, fill: C.skin }, { d: face, fill: C.skin }], 3);
  out += K.clipped(ear, K.fill(K.blob([[500, 370], [516, 380], [510, 414], [496, 420]]), C.skinS));
  out += K.line(K.curve([[500, 372], [512, 386], [506, 410]]), LINE, 3);
  // face cel shadow: right side and under the fringe
  const faceShadow = K.polyD([[470, 300], [540, 300], [540, 540], [368, 540], [410, 500], [446, 470], [466, 436], [470, 404], [462, 380], [478, 350]]);
  const fringeShadow = K.polyD([[270, 300], [540, 300], [540, 350], [506, 356], [488, 322], [462, 344], [440, 322], [396, 370], [384, 336], [338, 382], [320, 342], [290, 362], [270, 356]]);
  out += K.clipped(face, K.fill(faceShadow, C.skinS) + K.fill(fringeShadow, C.skinS));
  // hairline: the hair mass comes down over the top of the forehead
  out += K.fill(K.blob([[266, 330], [262, 262], [320, 214], [420, 206], [500, 236], [512, 300], [480, 290], [400, 272], [320, 286]], 0.8), C.hair);
  // cheek light from the lantern
  out += K.clipped(face, K.fill(K.blob([[272, 380], [300, 372], [306, 430], [290, 452], [274, 420]]), C.skinH));

  // rim light from the aura along the lit side of the face
  out += K.clipped(face, K.ink([[284, 300], [276, 350], [279, 372], [274, 404], [292, 452], [320, 488]], 9, '#FFF4C0', { in: 0.2, out: 0.3 }));
  // brows (behind bangs tips; drawn before bangs)
  out += K.fill(K.polyD([[378, 362], [388, 350], [454, 330], [460, 340], [452, 346]]), LINE);
  out += K.fill(K.polyD([[346, 362], [338, 352], [288, 340], [282, 348], [290, 350]]), LINE);
  // brow crease
  out += K.line('M360 346 L364 362 M368 342 L372 358', LINE, 2.4);

  // eyes
  const eyeN = K.blob([[382, 382], [410, 372], [446, 370], [448, 392], [426, 406], [394, 404]], 0.6);
  const eyeF = K.blob([[290, 378], [312, 374], [336, 382], [332, 400], [304, 402], [292, 392]], 0.6);
  for (const [eye, c, rx, ry] of [
    [eyeN, [410, 390] as P, 11, 16],
    [eyeF, [318, 390] as P, 8, 14],
  ] as const) {
    out += K.fill(eye, '#FFFFFF');
    out += K.clipped(
      eye,
      K.fill(K.ellipse(c, rx, ry), C.eye) +
        K.fill(K.ellipse([c[0], c[1] - ry * 0.35], rx, ry * 0.6), C.eyeS) +
        K.fill(K.ellipse([c[0], c[1] + 1], rx * 0.5, ry * 0.58), LINE) +
        K.fill(K.ellipse([c[0] - rx * 0.35, c[1] - ry * 0.35], rx * 0.3, rx * 0.3), '#FFFFFF') +
        K.fill(K.polyD([[c[0] - 40, c[1] - 30], [c[0] + 40, c[1] - 30], [c[0] + 40, c[1] - ry * 0.55], [c[0] - 40, c[1] - ry * 0.75]]), 'rgba(40,20,30,.22)'),
    );
  }
  // lids: heavy upper lids with a flick, thin lower
  out += K.ink([[378, 386], [396, 374], [424, 368], [446, 368], [454, 380]], 9, LINE, { in: 0.15, out: 0.1, min: 0.4 });
  out += K.ink([[398, 406], [424, 405], [442, 396]], 3.2, LINE, { in: 0.4, out: 0.4 });
  out += K.ink([[340, 386], [320, 374], [298, 374], [286, 384]], 7.5, LINE, { in: 0.15, out: 0.2, min: 0.4 });
  out += K.ink([[298, 398], [318, 402], [330, 398]], 2.6, LINE, { in: 0.4, out: 0.4 });

  // nose
  out += K.fill(K.polyD([[352, 396], [330, 432], [342, 436], [350, 430]]), C.skinS);
  out += K.ink([[354, 392], [338, 426], [334, 432], [346, 436]], 3.4, LINE, { in: 0.3, out: 0.2 });
  // mouth: a confident open grin
  const mouth = K.blob([[322, 462], [352, 458], [390, 456], [378, 474], [350, 482], [330, 476]], 0.8);
  out += K.shape(mouth, C.mouth, LINE, 3);
  out += K.clipped(mouth, K.fill(K.polyD([[318, 450], [396, 450], [392, 464], [320, 466]]), C.teeth) + K.fill(K.blob([[340, 480], [360, 470], [378, 476], [362, 486]]), '#C8525E'));
  out += K.ink([[312, 458], [322, 462]], 3, LINE);
  // chin crease
  out += K.ink([[340, 496], [356, 498]], 2.6, LINE, { in: 0.5, out: 0.5 });

  // bangs over the forehead
  out += cel(bang.map((d) => ({ d, fill: C.hair })), 3);
  out += K.clipped(
    bang.join(''),
    bangs()
      .map((s) => {
        const dir = K.unit(K.sub(s.tip, s.root));
        const n = K.perp(dir);
        return K.fill(spike(K.add(s.root, K.mul(n, -s.w * 0.24)), K.lerp(s.tip, s.root, 0.02), s.w * 0.46, s.bow ?? 0.15), C.hairS);
      })
      .join('') + K.ink([[330, 262], [322, 300]], 10, C.hairH, { in: 0.5, out: 0.5 }) + K.ink([[396, 256], [392, 300]], 10, C.hairH, { in: 0.5, out: 0.5 }),
  );
  return out;
}

function body(): string {
  let out = '';
  // scarf tails (behind), torso, collar, under, scarf wrap
  out += cel([{ d: Pz.scarfTail1, fill: C.scarf }, { d: Pz.scarfTail2, fill: C.scarf }], 3);
  out += K.clipped(Pz.scarfTail1 + Pz.scarfTail2, K.fill(K.blob([[500, 590], [800, 560], [800, 700], [500, 660]]), C.scarfS) + K.ink([[560, 540], [660, 506], [740, 480]], 9, C.scarfH));
  out += cel([{ d: Pz.torso, fill: C.jacket }], 3);
  // jacket cel shadow: right side and under the collar
  out += K.clipped(
    Pz.torso,
    K.fill(K.polyD([[520, 640], [760, 640], [760, 1010], [470, 1010], [500, 860]]), C.jacketS) +
      K.fill(K.blob([[300, 660], [560, 660], [520, 720], [340, 730]]), C.jacketS) +
      K.fill(K.polyD([[110, 740], [170, 700], [150, 1010], [96, 1010]]), C.jacketH),
  );
  // folds
  out += K.ink([[560, 760], [590, 860], [600, 960]], 4, LINE, { in: 0.3, out: 0.4 });
  out += K.ink([[250, 760], [236, 860]], 3.5, LINE, { in: 0.3, out: 0.4 });
  out += K.ink(Pz.placket, 4, LINE, { in: 0.1, out: 0.1 });
  // strap
  out += K.shape(Pz.strap, '#6B4631', LINE, 3) + K.clipped(Pz.strap, K.fill(K.polyD([[600, 650], [660, 680], [300, 1010], [240, 1010]]), '#4A2F20'));
  out += K.shape(Pz.buckle, C.brass, LINE, 3);
  out += cel([{ d: Pz.neck, fill: C.skin }], 3);
  out += K.clipped(Pz.neck, K.fill(Pz.neckShadow, C.skinS) + K.fill(K.polyD([[440, 452], [480, 452], [480, 620], [446, 620]]), C.skinS));
  out += cel([{ d: Pz.under, fill: C.under }], 3) + K.clipped(Pz.under, K.fill(K.polyD([[430, 630], [470, 630], [440, 780]]), C.underS));
  out += cel([{ d: Pz.collarL, fill: C.jacket }, { d: Pz.collarR, fill: C.jacket }], 3);
  out += K.clipped(Pz.collarR, K.fill(K.polyD([[490, 580], [560, 590], [560, 690], [500, 690]]), C.jacketS));
  out += cel([{ d: Pz.scarfWrap, fill: C.scarf }, { d: Pz.scarfKnot, fill: C.scarf }], 3);
  out += K.clipped(Pz.scarfWrap, K.fill(K.polyD([[330, 612], [530, 600], [530, 650], [330, 650]]), C.scarfS) + K.ink([[360, 572], [420, 560], [480, 560]], 8, C.scarfH));
  out += K.clipped(Pz.scarfKnot, K.fill(K.polyD([[300, 630], [400, 620], [400, 670], [300, 670]]), C.scarfS));
  out += K.ink([[400, 596], [460, 598], [500, 590]], 3, LINE, { in: 0.3, out: 0.3 });
  out += K.ink([[336, 612], [360, 630]], 3, LINE);
  return out;
}

function armAndLantern(): string {
  let out = '';
  out += K.clipped(Pz.torso, K.fill(K.blob([[200, 560], [300, 600], [320, 1010], [150, 1010]]), 'rgba(20,8,30,.45)'));
  out += cel([{ d: Pz.sleeve, fill: C.jacketH }], 3);
  out += K.clipped(Pz.sleeve, K.fill(K.polyD([[166, 580], [240, 580], [270, 1010], [186, 1010], [170, 800]]), C.jacket) + K.fill(K.polyD([[200, 700], [260, 700], [280, 1010], [220, 1010]]), C.jacketS));
  out += K.ink([[118, 820], [150, 800], [170, 830]], 3.5, LINE);
  out += cel([{ d: Pz.cuff, fill: C.glove }], 3);
  // lantern
  const L = Pz.LANTERN;
  out += K.line(L.ring, LINE, 11) + K.line(L.ring, C.brass, 5);
  out += cel([{ d: L.cap, fill: C.brass }, { d: L.base, fill: C.brass }], 3);
  out += K.clipped(L.cap + L.base, K.fill(K.polyD([[190, 540], [260, 540], [260, 730], [200, 730]]), C.brassS));
  out += K.shape(L.glass, '#FFF3B0', LINE, 5);
  out += K.clipped(L.glass, K.fill(K.ellipse(L.center, 60, 70), '#FFE58A') + K.fill(K.ellipse(L.center, 30, 40), '#FFFFFF'));
  for (const b of L.bars) out += K.ink(b, 5, LINE, { in: 0, out: 0 });
  out += K.fill(L.flame, '#FFFFFF');
  // fist
  out += cel([{ d: Pz.fist, fill: C.glove }, { d: Pz.thumb, fill: C.glove }], 3);
  out += K.clipped(Pz.fist, K.fill(K.polyD([[112, 540], [230, 530], [230, 590], [112, 590]]), C.gloveS));
  for (const k of Pz.knuckles) out += K.ink(k, 3, LINE, { in: 0.2, out: 0.5 });
  out += K.ink([[128, 506], [160, 494], [200, 498]], 5, '#6A5058');
  return out;
}

function aura(): { back: string; defs: string[] } {
  const glow = K.glowFilter(9, 1.3);
  const rnd = K.seeded(11);
  // An envelope around the figure: head at the top, shoulders wide below.
  const env = (t: number): P => {
    // t in [0,1] from lower-left, over the head, to lower-right
    const a = Math.PI * (1 + t);
    const rx = 292;
    const ry = 500;
    return [410 + Math.cos(a) * rx, 700 + Math.sin(a) * ry];
  };
  let outer = '';
  let inner = '';
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const root = env(t);
    const out = K.unit(K.sub(root, [410, 700]));
    const up = 0.55 + rnd() * 0.3;
    const len = 60 + rnd() * 90 + (1 - Math.abs(t - 0.5) * 2) * 130;
    const tip: P = [root[0] + out[0] * len * 0.55, root[1] + out[1] * len * 0.4 - len * up];
    outer += spike(root, tip, 70 + rnd() * 40, (rnd() - 0.5) * 0.5);
    inner += spike(K.lerp(root, [410, 700], 0.12), K.lerp(root, tip, 0.55), 46 + rnd() * 20, (rnd() - 0.5) * 0.5);
  }
  const bodyShape = K.blob([env(0), env(0.1), env(0.25), env(0.4), env(0.5), env(0.6), env(0.75), env(0.9), env(1), [760, 1010], [60, 1010]], 0.9);
  const innerShape = K.blob([[130, 1010], [110, 700], [180, 420], [300, 250], [410, 210], [520, 250], [640, 420], [700, 700], [690, 1010]], 0.9);
  const back =
    `<g filter="url(#${glow.id})" opacity=".96">` +
    K.fill(outer, '#FFD52E') +
    K.fill(bodyShape, '#FFE047') +
    K.fill(inner, '#FFF3A6') +
    K.fill(innerShape, '#FFF8CF') +
    `</g>`;
  return { back, defs: [glow.def] };
}

function sky(): { back: string; defs: string[] } {
  const g = K.linear([[0, '#2A1650'], [0.45, '#B23A48'], [0.75, '#F07A3A'], [1, '#FFC05A']]);
  const rocks = [
    { c: [90, 300] as P, r: 34, s: 1 },
    { c: [700, 700] as P, r: 44, s: 2 },
    { c: [640, 330] as P, r: 22, s: 3 },
    { c: [66, 880] as P, r: 28, s: 4 },
    { c: [742, 150] as P, r: 18, s: 5 },
  ]
    .map(({ c, r, s }) => {
      const rnd = K.seeded(s * 97);
      const pts: P[] = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const rr = r * (0.75 + rnd() * 0.45);
        return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.8] as P;
      });
      const d = K.polyD(pts);
      return K.shape(d, '#8A6A5C', LINE, 4) + K.clipped(d, K.fill(K.polyD([[c[0], c[1] - r * 2], [c[0] + r * 2, c[1] - r * 2], [c[0] + r * 2, c[1] + r * 2], [c[0] - r * 0.2, c[1] + r * 2]]), '#5A4038')) + K.line(`M${c[0]} ${c[1] + r} v${60 + r}`, 'rgba(255,240,200,.55)', 3);
    })
    .join('');
  const streaks = Array.from({ length: 26 }, (_, i) => {
    const rnd = K.seeded(i * 31 + 7);
    const x = rnd() * 800;
    const y = rnd() * 1000;
    const l = 60 + rnd() * 160;
    return K.line(`M${x.toFixed(0)} ${y.toFixed(0)} v-${l.toFixed(0)}`, 'rgba(255,250,220,.7)', 2 + rnd() * 3);
  }).join('');
  const bolt = (x: number, y: number, s: number): string =>
    K.line(`M${x} ${y} l${14 * s} ${-26 * s} l${-10 * s} ${-6 * s} l${18 * s} ${-30 * s}`, '#DDF4FF', 4, 'filter="url(#boltglow)"');
  const boltGlow = `<filter id="boltglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  return {
    back: `<rect width="800" height="1000" fill="url(#${g.id})"/>` + K.focusLines([400, 520], 250, 900, 90, 'rgba(255,236,200,.18)', 5, 16) + streaks + rocks,
    defs: [g.def, boltGlow],
    // bolts are returned separately via front()
  } as { back: string; defs: string[] } & { bolt?: typeof bolt };
}

export function hero(): string {
  const s = sky();
  const a = aura();
  const bolts =
    K.line('M170 400 l18 -30 l-12 -6 l22 -36', '#E6F7FF', 4, 'filter="url(#boltglow)"') +
    K.line('M640 520 l-16 -26 l12 -8 l-20 -34', '#E6F7FF', 4, 'filter="url(#boltglow)"') +
    K.line('M580 900 l20 -20 l-8 -10 l18 -22', '#E6F7FF', 3.5, 'filter="url(#boltglow)"');
  const lanternGlow = K.radial([[0, '#FFF7C8', 0.95], [0.4, '#FFD35A', 0.5], [1, '#FFB030', 0]]);
  return K.svg(
    K.W,
    K.H,
    [...s.defs, ...a.defs, lanternGlow.def],
    s.back + a.back + body() + head() + armAndLantern() + K.fill(K.ellipse([182, 640], 150, 150), `url(#${lanternGlow.id})`, 'style="mix-blend-mode:screen"') + bolts,
  );
}

// ---------------------------------------------------------------------------
// The Fade as a Dragon Ball villain: smooth glossy forms, hard cel shadow, a smug mask, a dark ki aura
// and a charging energy ball where the candle flame was.
import * as F from '../fade.ts';

export function fade(): string {
  const V = { robe: '#8E2436', robeS: '#521326', robeH: '#D2485C', mask: '#F8F5EE', maskS: '#B9BDD0', hole: '#140A18', hand: '#9FA7C4', handS: '#6A7092' };
  const sky = K.linear([[0, '#12081E'], [0.5, '#3B1450'], [0.8, '#7A2A5A'], [1, '#C0583A']]);
  const glow = K.glowFilter(10, 1.5);
  const ballGlow = K.radial([[0, '#FFFFFF', 1], [0.25, '#FFD6F4', 1], [0.55, '#E05AD8', 0.8], [1, '#8A2AC0', 0]]);
  const boltGlow = `<filter id="boltglow2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  let out = `<rect width="800" height="1000" fill="url(#${sky.id})"/>`;
  out += K.focusLines([400, 420], 200, 900, 80, 'rgba(230,180,255,.13)', 3, 18);
  // ground: a cracked plain far below, rocks lifting
  out += K.fill(K.polyD([[0, 860], [800, 820], [800, 1000], [0, 1000]]), '#2A1426') + K.line('M0 862 L800 822', '#E07A5A', 3);
  for (const [x, y, r] of [[80, 760, 30], [700, 700, 40], [620, 180, 20], [150, 240, 24], [720, 930, 26]] as const) {
    const d = K.polyD([[x - r, y], [x - r * 0.4, y - r * 0.8], [x + r * 0.6, y - r * 0.7], [x + r, y + r * 0.1], [x + r * 0.3, y + r * 0.7], [x - r * 0.6, y + r * 0.6]]);
    out += K.shape(d, '#6A4A60', LINE, 4) + K.clipped(d, K.fill(K.polyD([[x, y - r], [x + r * 2, y - r], [x + r * 2, y + r], [x, y + r]]), '#43283E'));
  }
  // dark ki aura hugging the figure
  const rnd = K.seeded(4);
  let tongues = '';
  for (let i = 0; i <= 36; i++) {
    const a = Math.PI + (i / 36) * Math.PI;
    const root: P = [400 + Math.cos(a) * 300, 620 + Math.sin(a) * 540];
    const len = 60 + rnd() * 110;
    const tip: P = [root[0] + Math.cos(a) * len * 0.5, root[1] + Math.sin(a) * len * 0.4 - len * 0.7];
    tongues += spike(root, tip, 70 + rnd() * 40, (rnd() - 0.5) * 0.5);
  }
  out += `<g filter="url(#${glow.id})">` + K.fill(tongues, '#7B2FB8') + K.fill(K.ellipse([400, 640], 300, 520), '#5A1E8C') + K.fill(K.ellipse([400, 660], 250, 470), '#2E0E4A') + `</g>`;

  // robe and hood: outline pass then fill pass
  const parts = [F.robe, F.hoodOuter];
  out += parts.map((d) => K.shape(d, 'none', LINE, 7)).join('') + parts.map((d) => K.fill(d, V.robe)).join('');
  // cel shadow: right side of every form, hard edge
  out += K.clipped(F.robe, K.fill(K.polyD([[430, 480], [720, 480], [720, 1010], [470, 1010], [450, 760]]), V.robeS) + K.fill(K.polyD([[150, 700], [230, 640], [200, 1010], [100, 1010]]), V.robeS));
  out += K.clipped(F.hoodOuter, K.fill(K.polyD([[460, 90], [620, 90], [620, 540], [520, 540], [540, 380], [520, 250]]), V.robeS));
  // glossy highlights: DB villains shine
  out += K.clipped(F.hoodOuter, K.ink([[300, 150], [262, 220], [240, 320]], 16, V.robeH, { in: 0.4, out: 0.5 }) + K.ink([[320, 128], [360, 110]], 8, '#FFFFFF', { in: 0.5, out: 0.5 }));
  out += K.clipped(F.robe, K.ink([[210, 600], [180, 760], [160, 920]], 14, V.robeH, { in: 0.3, out: 0.5 }));
  // folds
  for (const f of [[[520, 700], [560, 860], [580, 1000]], [[300, 720], [270, 880], [260, 1000]], [[420, 740], [420, 1000]]] as P[][]) out += K.ink(f, 5, LINE, { in: 0.2, out: 0.5 });
  // sleeves, in front of the robe
  out += K.shape(F.sleeveL, V.robe, LINE, 5) + K.shape(F.sleeveR, V.robe, LINE, 5);
  out += K.clipped(F.sleeveR, K.fill(K.polyD([[430, 640], [600, 560], [600, 720], [430, 720]]), V.robeS));
  out += K.clipped(F.sleeveL, K.ink([[240, 560], [300, 540], [350, 590]], 10, V.robeH, { in: 0.4, out: 0.4 }));

  // hood opening and the mask
  out += K.fill(F.hoodHole, V.hole);
  out += K.shape(F.mask, V.mask, LINE, 6);
  out += K.clipped(F.mask, K.fill(K.polyD([[420, 220], [520, 220], [520, 470], [400, 470], [470, 400], [476, 300]]), V.maskS) + K.ink([[346, 262], [330, 300], [326, 350]], 12, '#FFFFFF', { in: 0.3, out: 0.5 }));
  // smug brows carved into the mask, glowing eyes
  out += K.fill(K.polyD([[330, 312], [392, 326], [390, 334], [330, 322]]), LINE) + K.fill(K.polyD([[470, 312], [408, 326], [410, 334], [470, 322]]), LINE);
  const eyeGlow = K.glowFilter(4, 2);
  out += `<g filter="url(#${eyeGlow.id})">` + K.fill(K.polyD([[338, 340], [388, 338], [380, 352], [344, 352]]), '#FF2E4A') + K.fill(K.polyD([[462, 340], [412, 338], [420, 352], [456, 352]]), '#FF2E4A') + `</g>`;
  out += K.fill(K.ellipse([364, 345], 5, 5), '#FFFFFF') + K.fill(K.ellipse([436, 345], 5, 5), '#FFFFFF');
  // the smile: a smirk full of teeth
  out += K.shape(F.smile, '#3A0A14', LINE, 4) + K.clipped(F.smile, K.fill(K.polyD([[330, 380], [470, 380], [470, 402], [330, 400]]), '#FFFFFF') + K.line('M360 392 v14 M380 396 v14 M400 398 v14 M420 396 v14 M440 392 v14', LINE, 2.5));
  out += K.ink([[336, 384], [326, 374]], 4, LINE) + K.ink([[464, 384], [476, 372]], 4, LINE);

  // hands (pale, clawed) around a charging energy ball instead of a candle flame
  out += K.fill(K.ellipse([400, 560], 150, 150), `url(#${ballGlow.id})`);
  out += K.shape(F.handL, V.hand, LINE, 5) + K.shape(F.handR, V.hand, LINE, 5);
  out += K.clipped(F.handR, K.fill(K.polyD([[400, 600], [460, 600], [460, 700], [400, 700]]), V.handS));
  out += K.line('M364 650 l-10 8 M370 668 l-12 6 M436 650 l10 8 M430 668 l12 6', LINE, 3);
  out += K.shape(K.ellipse([400, 560], 46, 46), '#FFFFFF', '#F2A0F0', 8);
  out += boltsAround([400, 560]);
  out += boltGlow;
  return K.svg(K.W, K.H, [sky.def, glow.def, ballGlow.def, eyeGlow.def, boltGlow], out);

  function boltsAround(c: P): string {
    let b = '';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const p0: P = [c[0] + Math.cos(a) * 60, c[1] + Math.sin(a) * 60];
      const p1: P = [c[0] + Math.cos(a + 0.2) * 95, c[1] + Math.sin(a + 0.2) * 95];
      const p2: P = [c[0] + Math.cos(a - 0.1) * 120, c[1] + Math.sin(a - 0.1) * 120];
      b += `M${K.pt(p0)}L${K.pt(p1)}L${K.pt(p2)}`;
    }
    return K.line(b, '#FBE2FF', 3.5, 'filter="url(#boltglow2)"');
  }
}
