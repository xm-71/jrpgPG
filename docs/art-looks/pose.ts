// Wren's pose, shared by every look so the seven samples compare like for like: a bust in three-quarter
// view facing left, the lantern raised in the left hand beside the face, the scarf streaming out behind.
import { blob, curve, tube, polyD, type P } from './lib.ts';

export const WREN = {
  hair: '#4A2E24',
  skin: '#EBC3A2',
  eyes: '#E8A23A',
  jacket: '#2A1D2B',
  under: '#E9DFCB',
  scarf: '#E0457B',
  glove: '#3A2A2E',
  brass: '#C99A45',
  flame: '#FFC65A',
};

/** Neck, from under the jaw to the collar. */
export const neck = blob([[382, 470], [466, 452], [474, 540], [478, 610], [376, 618], [378, 540]], 0.6);
/** Shadow the jaw throws on the neck. */
export const neckShadow = blob([[380, 478], [468, 458], [472, 520], [430, 552], [388, 540]], 0.8);

/** Jacket: the whole torso silhouette. */
export const torso = blob(
  [
    [360, 596], [300, 628], [220, 656], [150, 700], [118, 760], [102, 860], [96, 1010], [730, 1010], [716, 880], [700, 770], [668, 700], [610, 652], [520, 612], [470, 594],
  ],
  0.55,
);
/** Standing collar, two flaps. */
export const collarL = blob([[392, 596], [352, 588], [310, 610], [300, 650], [336, 690], [390, 668], [410, 632]], 0.7);
export const collarR = blob([[440, 590], [492, 580], [540, 598], [552, 640], [522, 682], [468, 668], [446, 630]], 0.7);
/** Undershirt showing in the V of the jacket. */
export const under = polyD([[390, 640], [462, 636], [440, 760], [426, 772]]);
/** The jacket's front edge and a satchel strap. */
export const placket: P[] = [[430, 766], [436, 860], [446, 1010]];
export const strap = polyD([[600, 650], [640, 676], [248, 1010], [196, 1010]]);
export const buckle = polyD([[404, 850], [446, 818], [470, 850], [428, 884]]);

/** Scarf wrapped at the throat, with two tails streaming right. */
export const scarfWrap = blob([[346, 566], [410, 548], [492, 546], [520, 572], [516, 612], [470, 632], [400, 640], [344, 628], [330, 596]], 0.8);
export const scarfTail1 = blob(
  [
    [488, 566], [560, 520], [640, 492], [720, 470], [790, 440], [770, 488], [712, 520], [640, 556], [580, 590], [512, 610],
  ],
  0.8,
);
export const scarfTail2 = blob(
  [
    [496, 598], [570, 612], [650, 600], [730, 612], [786, 640], [730, 648], [660, 652], [590, 650], [520, 632],
  ],
  0.8,
);
export const scarfKnot = blob([[322, 600], [360, 584], [388, 606], [376, 648], [336, 660], [312, 636]], 0.8);

/** Raised arm: forearm from the elbow up behind the lantern to the fist. */
export const sleeve = tube([[200, 1010], [150, 880], [118, 790], [138, 690], [162, 590]], [118, 108, 96, 84, 74]);
export const cuff = blob([[124, 598], [200, 588], [206, 628], [128, 640]], 0.6);
/** Gloved fist around the lantern ring. */
export const fist = blob([[126, 498], [170, 480], [212, 492], [226, 528], [214, 566], [166, 578], [124, 562], [112, 530]], 0.7);
export const knuckles: P[][] = [
  [[140, 500], [148, 540]],
  [[166, 492], [172, 540]],
  [[192, 496], [196, 540]],
];
export const thumb = blob([[196, 528], [232, 520], [242, 544], [214, 560]], 0.8);

/** Lantern parts. */
export const LANTERN = {
  ring: curve([[150, 560], [160, 520], [184, 506], [206, 522], [212, 560]]),
  cap: polyD([[134, 572], [230, 572], [214, 548], [150, 548]]),
  glass: blob([[132, 578], [232, 578], [240, 640], [232, 700], [132, 700], [124, 640]], 0.35),
  base: polyD([[126, 700], [238, 700], [246, 722], [118, 722]]),
  bars: [
    [[160, 578], [156, 700]],
    [[204, 578], [208, 700]],
  ] as P[][],
  flame: blob([[182, 604], [198, 640], [194, 672], [182, 680], [170, 672], [166, 640]], 1),
  center: [182, 646] as P,
};
