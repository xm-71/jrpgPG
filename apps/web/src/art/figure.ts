import type { Look } from '@duskline/core';

/**
 * Placeholder hero art, drawn as SVG from a hero's `Look`. It is a deliberate stand-in: flat,
 * paper-cut figures in the Twilight Graphic palette, so the whole game can be built and
 * played before commissioned illustration and Spine rigs exist. The same SVG feeds menus
 * (as an image) and the battle scene (rasterised to a texture).
 */

const INK = '#17132B';

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
  const cape = look.cape ? `<path d="M64 120 L136 120 L168 300 L32 300 Z" fill="${shade(o, -0.42)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${crop === 'full' ? 200 : ''}" fill="none">
  <g transform="translate(100 330) scale(${h}) translate(-100 -330)">
    ${opts.noShadow ? '' : '<ellipse cx="100" cy="330" rx="54" ry="8" fill="#000" opacity=".35"/>'}
    ${cape}
    ${hairBack(look)}
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M84 250 L82 322 L106 322 L102 250 Z" fill="${trouser}"/>
      <path d="M98 250 L96 322 L120 322 L116 250 Z" fill="${shade(trouser, 0.08)}"/>
      <path d="M78 318 L110 318 L114 330 L74 330 Z" fill="${INK}"/>
      <path d="M92 318 L124 318 L128 330 L88 330 Z" fill="${INK}"/>
      <path d="M72 116 L128 116 L122 202 L78 202 Z" fill="${o}"/>
      <path d="M70 192 L130 192 L148 268 L52 268 Z" fill="${o}"/>
      <path d="M70 192 L130 192 L134 208 L66 208 Z" fill="${dark}"/>
      <path d="M62 122 L74 118 L80 186 L64 190 Z" fill="${o}"/>
      <path d="M126 118 L138 122 L148 184 L134 190 Z" fill="${o}"/>
      <circle cx="64" cy="194" r="7" fill="${skin}"/>
      <circle cx="144" cy="192" r="7" fill="${skin}"/>
      <path d="M92 106 L108 106 L110 120 L90 120 Z" fill="${skin}"/>
      <path d="M72 200 L128 200" stroke="${a}" stroke-width="5"/>
      <path d="M88 116 L100 140 L112 116" stroke="${a}" stroke-width="4" fill="none"/>
    </g>
    <path d="M128 120 L122 200 L146 264" stroke="#FFD58A" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>
    ${prop(look)}
    <g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <ellipse cx="100" cy="86" rx="28" ry="31" fill="${skin}"/>
    </g>
    <path d="M74 92 C76 114 90 122 100 122 C90 116 82 106 80 92 Z" fill="#000" opacity=".1"/>
    <ellipse cx="86" cy="98" rx="6" ry="3.5" fill="#E0457B" opacity=".25"/>
    <ellipse cx="114" cy="98" rx="6" ry="3.5" fill="#E0457B" opacity=".25"/>
    <g>
      <ellipse cx="88" cy="88" rx="5" ry="7.5" fill="${INK}"/>
      <ellipse cx="112" cy="88" rx="5" ry="7.5" fill="${INK}"/>
      <ellipse cx="88" cy="90" rx="3.4" ry="5.4" fill="${a}"/>
      <ellipse cx="112" cy="90" rx="3.4" ry="5.4" fill="${a}"/>
      <circle cx="86.5" cy="86" r="1.8" fill="#fff"/>
      <circle cx="110.5" cy="86" r="1.8" fill="#fff"/>
      <path d="M81 79 C85 76 90 76 94 78 M106 78 C110 76 115 76 119 79" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M95 105 C98 107 102 107 105 105" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
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
