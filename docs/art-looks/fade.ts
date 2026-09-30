// The Unturning Acolyte, shared by every look: a hooded figure in a long robe, a white mask with a red
// smile, holding a candle at its chest. Each look renders these shapes in its own way and adds its own
// monster language on top.
import { blob, polyD, type P } from './lib.ts';

export const hoodOuter = blob(
  [[400, 96], [470, 112], [540, 170], [578, 262], [588, 360], [572, 448], [612, 500], [520, 520], [400, 530], [280, 520], [188, 500], [228, 448], [212, 360], [222, 262], [260, 170], [330, 112]],
  0.8,
);
/** The dark opening of the hood around the mask. */
export const hoodHole = blob([[400, 196], [470, 218], [520, 290], [528, 380], [500, 460], [400, 490], [300, 460], [272, 380], [280, 290], [330, 218]], 0.9);
export const mask = blob([[400, 232], [456, 246], [488, 300], [490, 370], [466, 432], [400, 458], [334, 432], [310, 370], [312, 300], [344, 246]], 0.9);
export const eyeL: P = [362, 336];
export const eyeR: P = [438, 336];
export const smile = blob([[340, 386], [372, 404], [400, 408], [428, 404], [460, 386], [446, 414], [400, 430], [354, 414]], 0.8);
export const robe = blob(
  [[268, 490], [400, 500], [532, 490], [600, 560], [640, 700], [680, 880], [700, 1010], [100, 1010], [120, 880], [160, 700], [200, 560]],
  0.7,
);
export const sleeveL = blob([[230, 540], [300, 520], [372, 600], [400, 660], [372, 704], [310, 690], [240, 640], [214, 590]], 0.8);
export const sleeveR = blob([[570, 540], [500, 520], [428, 600], [400, 660], [428, 704], [490, 690], [560, 640], [586, 590]], 0.8);
export const handL = blob([[352, 640], [386, 620], [396, 660], [380, 690], [352, 680]], 0.9);
export const handR = blob([[448, 640], [414, 620], [404, 660], [420, 690], [448, 680]], 0.9);
export const candle = polyD([[382, 560], [418, 560], [418, 690], [382, 690]]);
export const drip = blob([[382, 560], [400, 552], [418, 560], [418, 590], [412, 600], [406, 584], [396, 608], [388, 590], [382, 596]], 0.6);
export const flame = blob([[400, 440], [418, 500], [414, 536], [400, 552], [386, 536], [382, 500]], 1);
export const wick: P[] = [[400, 552], [400, 562]];
