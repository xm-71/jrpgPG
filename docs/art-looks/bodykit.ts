// Wren's body, jacket, scarf, raised arm and lantern, rendered in any look's colours and line.
import * as K from './lib.ts';
import * as Pz from './pose.ts';

export interface BodyStyle {
  line: string;
  /** Outline width (the silhouette). Inner lines are about 60% of it. */
  lw: number;
  skin: string; skinS: string;
  jacket: string; jacketS: string; jacketH: string;
  under: string; underS: string;
  scarf: string; scarfS: string; scarfH: string;
  glove: string; gloveS: string;
  brass: string; brassS: string;
  strap: string; strapS: string;
  /** Hard cel shadows on the clothes. Off for flat or light-only looks. */
  shade?: boolean;
  /** A pattern fill laid over the scarf (Demon Slayer's woven patterns, halftone...). */
  scarfPattern?: string;
  jacketPattern?: string;
  /** Extra filter attribute applied to line work groups. */
  filter?: string;
}

function cel(parts: Array<{ d: string; fill: string }>, st: BodyStyle, w = st.lw): string {
  return parts.map((p) => K.shape(p.d, 'none', st.line, w * 2)).join('') + parts.map((p) => K.fill(p.d, p.fill)).join('');
}

export function bodyBack(st: BodyStyle): string {
  const shade = st.shade !== false;
  const inner = st.lw * 0.8;
  let out = '';
  out += cel([{ d: Pz.scarfTail1, fill: st.scarf }, { d: Pz.scarfTail2, fill: st.scarf }], st);
  if (st.scarfPattern) out += K.clipped(Pz.scarfTail1 + Pz.scarfTail2, `<rect width="800" height="1000" fill="${st.scarfPattern}"/>`);
  if (shade) out += K.clipped(Pz.scarfTail1 + Pz.scarfTail2, K.fill(K.blob([[500, 590], [800, 560], [800, 700], [500, 660]]), st.scarfS) + K.ink([[560, 540], [660, 506], [740, 480]], 9, st.scarfH));
  out += cel([{ d: Pz.torso, fill: st.jacket }], st);
  if (st.jacketPattern) out += K.clipped(Pz.torso, `<rect width="800" height="1000" fill="${st.jacketPattern}"/>`);
  if (shade)
    out += K.clipped(
      Pz.torso,
      K.fill(K.polyD([[520, 640], [760, 640], [760, 1010], [470, 1010], [500, 860]]), st.jacketS) +
        K.fill(K.blob([[300, 660], [560, 660], [520, 720], [340, 730]]), st.jacketS) +
        K.fill(K.polyD([[110, 740], [170, 700], [150, 1010], [96, 1010]]), st.jacketH),
    );
  out += K.ink([[560, 760], [590, 860], [600, 960]], inner, st.line, { in: 0.3, out: 0.4 });
  out += K.ink([[250, 760], [236, 860]], inner * 0.9, st.line, { in: 0.3, out: 0.4 });
  out += K.ink(Pz.placket, inner, st.line, { in: 0.1, out: 0.1 });
  out += K.shape(Pz.strap, st.strap, st.line, st.lw);
  if (shade) out += K.clipped(Pz.strap, K.fill(K.polyD([[600, 650], [660, 680], [300, 1010], [240, 1010]]), st.strapS));
  out += K.shape(Pz.buckle, st.brass, st.line, st.lw);
  out += cel([{ d: Pz.neck, fill: st.skin }], st);
  out += K.clipped(Pz.neck, K.fill(Pz.neckShadow, st.skinS) + (shade ? K.fill(K.polyD([[440, 452], [480, 452], [480, 620], [446, 620]]), st.skinS) : ''));
  out += cel([{ d: Pz.under, fill: st.under }], st) + (shade ? K.clipped(Pz.under, K.fill(K.polyD([[430, 630], [470, 630], [440, 780]]), st.underS)) : '');
  out += cel([{ d: Pz.collarL, fill: st.jacket }, { d: Pz.collarR, fill: st.jacket }], st);
  if (shade) out += K.clipped(Pz.collarR, K.fill(K.polyD([[490, 580], [560, 590], [560, 690], [500, 690]]), st.jacketS));
  out += cel([{ d: Pz.scarfWrap, fill: st.scarf }, { d: Pz.scarfKnot, fill: st.scarf }], st);
  if (st.scarfPattern) out += K.clipped(Pz.scarfWrap + Pz.scarfKnot, `<rect width="800" height="1000" fill="${st.scarfPattern}"/>`);
  if (shade) {
    out += K.clipped(Pz.scarfWrap, K.fill(K.polyD([[330, 612], [530, 600], [530, 650], [330, 650]]), st.scarfS) + K.ink([[360, 572], [420, 560], [480, 560]], 8, st.scarfH));
    out += K.clipped(Pz.scarfKnot, K.fill(K.polyD([[300, 630], [400, 620], [400, 670], [300, 670]]), st.scarfS));
  }
  out += K.ink([[400, 596], [460, 598], [500, 590]], inner, st.line, { in: 0.3, out: 0.3 });
  out += K.ink([[336, 612], [360, 630]], inner, st.line);
  return out;
}

/** The raised arm and the lantern. `glass` draws what is inside the glass (the flame, in the look's own way). */
export function armFront(st: BodyStyle, glass: string, glassFill = '#FFF3B0'): string {
  const shade = st.shade !== false;
  const inner = st.lw * 0.8;
  let out = '';
  out += K.clipped(Pz.torso, K.fill(K.blob([[200, 560], [300, 600], [320, 1010], [150, 1010]]), 'rgba(10,4,16,.4)'));
  out += cel([{ d: Pz.sleeve, fill: shade ? st.jacketH : st.jacket }], st);
  if (st.jacketPattern) out += K.clipped(Pz.sleeve, `<rect width="800" height="1000" fill="${st.jacketPattern}"/>`);
  if (shade) out += K.clipped(Pz.sleeve, K.fill(K.polyD([[166, 580], [240, 580], [270, 1010], [186, 1010], [170, 800]]), st.jacket) + K.fill(K.polyD([[200, 700], [260, 700], [280, 1010], [220, 1010]]), st.jacketS));
  out += K.ink([[118, 820], [150, 800], [170, 830]], inner, st.line);
  out += cel([{ d: Pz.cuff, fill: st.glove }], st);
  const L = Pz.LANTERN;
  out += K.line(L.ring, st.line, 11) + K.line(L.ring, st.brass, 5);
  out += cel([{ d: L.cap, fill: st.brass }, { d: L.base, fill: st.brass }], st);
  if (shade) out += K.clipped(L.cap + L.base, K.fill(K.polyD([[190, 540], [260, 540], [260, 730], [200, 730]]), st.brassS));
  out += K.shape(L.glass, glassFill, st.line, st.lw * 1.6);
  out += K.clipped(L.glass, glass);
  for (const b of L.bars) out += K.ink(b, st.lw * 1.6, st.line, { in: 0, out: 0 });
  out += cel([{ d: Pz.fist, fill: st.glove }, { d: Pz.thumb, fill: st.glove }], st);
  if (shade) out += K.clipped(Pz.fist, K.fill(K.polyD([[112, 540], [230, 530], [230, 590], [112, 590]]), st.gloveS));
  for (const k of Pz.knuckles) out += K.ink(k, inner, st.line, { in: 0.2, out: 0.5 });
  return out;
}
