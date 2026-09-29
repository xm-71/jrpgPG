import type { Look } from '@duskline/core';

/**
 * Hero art, drawn as SVG from a hero's `Look`: tall, angular figures in long coats, cut from ink
 * with a hard shadow and a rim of accent light. A deliberate stand-in until commissioned
 * illustration exists; the same SVG feeds menus, cards and the battle scene.
 */

const INK = '#07060B';

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number): number => {
    const v = (n >> shift) & 255;
    const t = amount < 0 ? 0 : 255;
    return Math.round(v + (t - v) * Math.abs(amount));
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

function hairBack(look: Look): string {
  const c = look.hairColor;
  switch (look.hair) {
    case 'long':
      return `<path d="M66 84 C58 130 62 190 76 214 L100 206 L124 214 C138 190 142 130 134 84 Z" fill="${shade(c, -0.18)}"/>`;
    case 'ponytail':
      return `<path d="M128 70 C160 66 176 100 170 150 C166 178 152 196 146 206 C150 170 148 130 128 100 Z" fill="${shade(c, -0.12)}"/>`;
    case 'bob':
      return `<path d="M66 82 C60 112 66 128 80 134 L120 134 C134 128 140 112 134 82 Z" fill="${shade(c, -0.18)}"/>`;
    case 'hooded':
      return `<path d="M60 96 C56 40 92 30 100 30 C108 30 144 40 140 96 C142 122 128 134 100 134 C72 134 58 122 60 96 Z" fill="${look.outfit}"/>`;
    default:
      return '';
  }
}

function hairFront(look: Look): string {
  const c = look.hairColor;
  const hi = shade(c, 0.28);
  const cap = `M67 86 C64 46 92 36 106 40 C128 42 138 62 133 90 C128 76 118 66 100 64 C84 64 73 72 67 86 Z`;
  switch (look.hair) {
    case 'spiky':
      return `<path d="M66 88 L62 62 L76 70 L74 44 L90 58 L98 36 L108 56 L124 40 L124 62 L140 56 L134 90 C128 76 118 68 100 66 C84 66 72 74 66 88 Z" fill="${c}"/>
        <path d="M84 58 L98 40 L104 56" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`;
    case 'bob':
      return `<path d="M64 92 C60 48 92 34 106 38 C130 42 142 64 136 92 C130 96 126 88 126 80 C118 66 84 66 74 80 C74 88 70 96 64 92 Z" fill="${c}"/>
        <path d="M80 56 C92 46 110 46 122 56" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`;
    case 'crown':
      return `<path d="${cap}" fill="${c}"/><circle cx="100" cy="36" r="17" fill="${c}"/>
        <path d="M74 60 C88 50 112 50 126 60" fill="none" stroke="${look.accent}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="100" cy="50" r="4" fill="${look.accent}"/>`;
    case 'hooded':
      return `<path d="M72 86 C74 66 90 60 100 60 C112 60 126 66 128 86 C120 72 108 68 100 68 C92 68 80 72 72 86 Z" fill="${c}"/>`;
    default:
      return `<path d="${cap}" fill="${c}"/>
        <path d="M80 54 C92 46 112 46 124 56" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`;
  }
}

function prop(look: Look): string {
  const a = look.accent;
  const o = look.outfit;
  const metal = '#DAD6EE';
  switch (look.prop) {
    case 'lantern':
      return `<circle cx="158" cy="222" r="30" fill="${a}" opacity=".22"/>
        <path d="M146 192 C148 204 152 208 156 208" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <rect x="146" y="208" width="24" height="30" rx="5" fill="${a}" stroke="${INK}" stroke-width="3"/>
        <rect x="152" y="214" width="12" height="18" rx="4" fill="#FFF4D2"/>`;
    case 'blade':
      return `<path d="M146 196 L178 62 L186 66 L154 200 Z" fill="${metal}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M150 190 L178 70" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
        <rect x="138" y="190" width="24" height="7" rx="3" fill="${a}" stroke="${INK}" stroke-width="3" transform="rotate(-14 150 194)"/>`;
    case 'greatsword':
      return `<path d="M150 200 L162 40 L176 44 L166 204 Z" fill="${metal}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M160 190 L166 56" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
        <rect x="140" y="196" width="40" height="8" rx="3" fill="${a}" stroke="${INK}" stroke-width="3"/>`;
    case 'rail':
      return `<path d="M132 210 L184 176" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
        <path d="M132 210 L184 176" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="184" cy="176" r="8" fill="${a}" stroke="${INK}" stroke-width="3"/>`;
    case 'needle':
      return `<path d="M148 196 L188 88" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <path d="M148 196 L188 88" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
        <path d="M188 78 L194 92 L182 92 Z" fill="${a}" stroke="${INK}" stroke-width="2"/>`;
    case 'kite':
      return `<path d="M146 190 C140 150 150 116 160 92" fill="none" stroke="${INK}" stroke-width="2"/>
        <path d="M160 46 L184 80 L160 118 L136 80 Z" fill="${a}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M160 46 L160 118 M136 80 L184 80" stroke="${INK}" stroke-width="2" opacity=".6"/>`;
    case 'staff':
      return `<path d="M154 236 L154 70" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
        <path d="M154 236 L154 70" stroke="${shade(o, 0.2)}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="154" cy="62" r="14" fill="${a}" stroke="${INK}" stroke-width="3"/>
        <circle cx="154" cy="62" r="26" fill="${a}" opacity=".2"/>`;
    case 'orb':
      return `<circle cx="162" cy="196" r="30" fill="${a}" opacity=".2"/>
        <circle cx="162" cy="196" r="15" fill="${INK}" stroke="${a}" stroke-width="3"/>
        <circle cx="157" cy="191" r="4" fill="#fff" opacity=".8"/>`;
    case 'compass':
      return `<circle cx="160" cy="206" r="20" fill="${a}" stroke="${INK}" stroke-width="3"/>
        <circle cx="160" cy="206" r="14" fill="#FFF4D2"/>
        <path d="M160 194 L165 206 L160 218 L155 206 Z" fill="${INK}"/>
        <path d="M148 190 L154 190" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    case 'wire':
      return `<path d="M146 196 L160 180 L152 168 L170 154 L162 142 L182 126" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M146 196 L160 180 L152 168 L170 154 L162 142 L182 126" fill="none" stroke="${a}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="184" cy="122" r="7" fill="${a}" opacity=".5"/>`;
    case 'trowel':
      return `<path d="M142 196 L166 168 L184 214 L152 214 Z" fill="${metal}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <rect x="138" y="196" width="18" height="10" rx="4" fill="${a}" stroke="${INK}" stroke-width="3" transform="rotate(-40 147 201)"/>`;
    case 'scroll':
      return `<rect x="142" y="180" width="34" height="14" rx="7" fill="#F4E6C8" stroke="${INK}" stroke-width="3"/>
        <circle cx="142" cy="187" r="7" fill="${a}" stroke="${INK}" stroke-width="3"/>`;
    case 'anchor':
      return `<path d="M158 168 L158 232 M144 186 L172 186 M140 224 C142 240 158 244 158 232 C158 244 174 240 176 224" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
        <path d="M158 168 L158 232 M144 186 L172 186 M140 224 C142 240 158 244 158 232 C158 244 174 240 176 224" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case 'bow':
      return `<path d="M170 130 C196 170 196 226 170 262" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
        <path d="M170 130 C196 170 196 226 170 262" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

export interface FigureOptions {
  /** 'full' is the whole body for the battle scene; 'bust' crops to head and shoulders for menus. */
  crop?: 'full' | 'bust' | 'half';
  /** Skip the ground shadow (menus that draw their own). */
  noShadow?: boolean;
}

/** SVG markup for a hero. Coordinates are a 200 x 340 canvas with feet on y = 330. */
export function figureSvg(look: Look, opts: FigureOptions = {}): string {
  const crop = opts.crop ?? 'full';
  const viewBox = crop === 'bust' ? '46 24 108 116' : crop === 'half' ? '30 20 150 230' : '0 0 200 340';
  const h = look.height;
  const o = look.outfit;
  const a = look.accent;
  const skin = look.skin;
  const dark = shade(o, -0.35);
  const trouser = shade(o, -0.55);
  const cape = look.cape ? `<path d="M62 118 L138 118 L176 312 L100 296 L24 312 Z" fill="${shade(o, -0.55)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '';
  const rim = shade(a, 0.15);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${crop === 'full' ? 200 : ''}" fill="none">
  <g transform="translate(100 330) scale(${h}) translate(-100 -330)">
    ${opts.noShadow ? '' : '<ellipse cx="100" cy="330" rx="54" ry="8" fill="#000" opacity=".5"/>'}
    ${cape}
    ${hairBack(look)}
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M86 250 L84 322 L104 322 L100 250 Z" fill="${trouser}"/>
      <path d="M100 250 L98 322 L118 322 L114 250 Z" fill="${shade(trouser, 0.06)}"/>
      <path d="M80 316 L108 316 L112 330 L76 330 Z" fill="${INK}"/>
      <path d="M94 316 L122 316 L126 330 L90 330 Z" fill="${INK}"/>
      <path d="M72 114 L128 114 L124 200 L76 200 Z" fill="${o}"/>
      <path d="M74 190 L126 190 L150 304 L112 296 L100 250 L88 296 L50 304 Z" fill="${o}"/>
      <path d="M100 118 L100 250" stroke="${dark}" stroke-width="3"/>
      <path d="M62 120 L74 116 L78 190 L62 196 Z" fill="${o}"/>
      <path d="M126 116 L138 120 L146 190 L132 194 Z" fill="${o}"/>
      <path d="M58 188 L70 192 L68 204 L56 200 Z" fill="${skin}"/>
      <path d="M136 188 L148 186 L150 198 L138 200 Z" fill="${skin}"/>
      <path d="M92 104 L108 104 L110 118 L90 118 Z" fill="${skin}"/>
      <path d="M76 198 L124 198" stroke="${a}" stroke-width="4"/>
      <path d="M80 114 L100 146 L120 114" stroke="${a}" stroke-width="4" fill="${dark}"/>
    </g>
    <path d="M100 120 L100 190 L112 296 L150 304 L126 190 L128 116 Z" fill="#000" opacity=".22"/>
    <circle cx="100" cy="162" r="7" fill="${INK}" stroke="${a}" stroke-width="2"/>
    <path d="M100 157 L100 167 M95 162 L105 162" stroke="${a}" stroke-width="1.5"/>
    <path d="M128 118 L126 190 L150 302" stroke="${rim}" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>
    <path d="M72 116 L62 124 L60 190" stroke="${rim}" stroke-width="1.5" stroke-linecap="round" opacity=".45"/>
    ${prop(look)}
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <path d="M74 84 C74 62 86 54 100 54 C114 54 126 62 126 84 C126 104 116 118 100 120 C84 118 74 104 74 84 Z" fill="${skin}"/>
    </g>
    <path d="M100 56 C114 56 126 64 126 84 C126 104 116 118 100 120 C108 110 112 98 112 84 C112 70 108 60 100 56 Z" fill="#000" opacity=".16"/>
    <g>
      <path d="M81 88 L88 84 L96 88 L88 91 Z" fill="${INK}"/>
      <path d="M104 88 L112 84 L119 88 L112 91 Z" fill="${INK}"/>
      <circle cx="88.5" cy="87.8" r="2.3" fill="${a}"/>
      <circle cx="111.5" cy="87.8" r="2.3" fill="${a}"/>
      <path d="M80 80 L95 81 M105 81 L120 80" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M97 101 L103 101" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M100 90 L98 97 L101 97" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
    </g>
    ${hairFront(look)}
  </g>
</svg>`;
}

/** A data URL for use as an image source. */
export function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export { shade };
