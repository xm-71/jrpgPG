import type { MangaStyle } from '@duskline/core';
import { STYLES } from './styles';

/** Display names of the manga traditions, for the UI. */
export const STYLE_NAME = Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, v.name])) as Record<MangaStyle, string>;
