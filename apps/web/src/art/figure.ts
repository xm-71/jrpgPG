/**
 * Hero art. Heroes are drawn by the manga renderer in `./manga`, each in the manga tradition
 * their `Look` names; this module keeps the entry points the rest of the client uses.
 */
export { mangaFigure as figureSvg, type Crop, type FigureOptions } from './manga/figure';
export { shade } from './color';

/** A data URL for use as an image source. */
export function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
