import type { CardDef } from '@duskline/core';

const glyphs: Record<CardDef['art']['glyph'], string> = {
  lantern: `<path d="M48 40 C50 30 70 30 72 40" fill="none" stroke-width="5"/><rect x="42" y="42" width="36" height="52" rx="8"/><rect x="52" y="52" width="16" height="32" rx="6" fill="#FFF4D2" stroke="none"/><path d="M42 100 L78 100" stroke-width="5"/>`,
  coat: `<path d="M34 46 L52 38 L68 38 L86 46 L94 104 L74 104 L72 74 L48 74 L46 104 L26 104 Z"/><path d="M60 40 L60 104" stroke-width="3"/><circle cx="66" cy="62" r="3" fill="currentColor"/><circle cx="66" cy="78" r="3" fill="currentColor"/>`,
  compass: `<circle cx="60" cy="70" r="36"/><circle cx="60" cy="70" r="26" fill="#FFF4D2" stroke-width="3"/><path d="M60 46 L70 70 L60 94 L50 70 Z" fill="currentColor"/>`,
  biscuit: `<rect x="30" y="46" width="60" height="48" rx="14"/><circle cx="46" cy="62" r="3.5" fill="currentColor"/><circle cx="62" cy="76" r="3.5" fill="currentColor"/><circle cx="76" cy="60" r="3.5" fill="currentColor"/><circle cx="50" cy="82" r="3.5" fill="currentColor"/>`,
  whistle: `<path d="M30 70 L74 58 C92 56 98 82 82 90 L44 92 C34 92 30 82 30 70 Z"/><circle cx="76" cy="72" r="5" fill="currentColor"/><path d="M34 62 L26 52" stroke-width="5"/>`,
  ledger: `<rect x="34" y="34" width="52" height="68" rx="5"/><path d="M46 34 L46 102 M56 52 L76 52 M56 64 L76 64 M56 76 L70 76" stroke-width="3"/>`,
  chime: `<path d="M60 30 L60 44 M60 44 C36 44 34 78 30 92 L90 92 C86 78 84 44 60 44 Z"/><circle cx="60" cy="98" r="6" fill="currentColor"/><path d="M48 104 L48 116 M72 104 L72 118" stroke-width="3"/>`,
  ribbon: `<path d="M28 60 C44 40 58 80 74 60 C86 46 94 56 96 62 L96 84 C90 78 84 70 74 82 C58 100 44 62 28 82 Z"/>`,
  anchor: `<path d="M60 34 L60 100 M42 52 L78 52 M30 88 C32 108 60 112 60 100 C60 112 88 108 90 88" fill="none" stroke-width="7"/><circle cx="60" cy="32" r="7"/>`,
  sun: `<circle cx="60" cy="68" r="22" fill="#FFF4D2"/><path d="M60 26 L60 38 M60 98 L60 110 M18 68 L30 68 M90 68 L102 68 M30 38 L38 46 M82 90 L90 98 M90 38 L82 46 M38 90 L30 98" stroke-width="5"/>`,
  key: `<circle cx="44" cy="58" r="16"/><circle cx="44" cy="58" r="6" fill="currentColor"/><path d="M56 66 L96 96 M82 86 L76 96 M92 94 L86 104" stroke-width="6" fill="none"/>`,
};

/** A Memory Card as SVG: a hue-tinted gradient with a bold glyph and rarity stars. */
export function cardSvg(card: CardDef, opts: { stars?: boolean } = {}): string {
  const h = card.art.hue;
  const bright = card.rarity === 5 ? 62 : card.rarity === 4 ? 54 : 44;
  const frame = card.rarity === 5 ? '#F2B43A' : card.rarity === 4 ? '#B58CFF' : '#8FB4D9';
  const stars = opts.stars === false ? '' : Array.from({ length: card.rarity }, (_, i) => `<path transform="translate(${60 - card.rarity * 7 + i * 14 + 7} 138)" d="M0 -5 L1.6 -1.6 L5 -1.2 L2.5 1.2 L3.2 5 L0 3.2 L-3.2 5 L-2.5 1.2 L-5 -1.2 L-1.6 -1.6 Z" fill="${frame}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="hsl(${h} 70% ${bright}%)"/>
      <stop offset="1" stop-color="hsl(${(h + 40) % 360} 60% ${Math.max(14, bright - 34)}%)"/>
    </linearGradient>
  </defs>
  <path d="M8 4 L112 4 L112 148 L104 156 L8 156 Z" fill="url(#g)" stroke="${frame}" stroke-width="3"/>
  <path d="M8 118 L112 96 L112 148 L104 156 L8 156 Z" fill="#000" opacity=".28"/>
  <g color="#17132B" fill="#F4F1F8" stroke="#17132B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${glyphs[card.art.glyph]}</g>
  ${stars}
</svg>`;
}
