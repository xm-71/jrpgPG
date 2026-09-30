/**
 * What an iPhone or iPad needs, beyond the manifest, to treat the site as an app.
 *
 * The Home Screen icon is a plain PNG named in the page (`apple-touch-icon`), in the sizes iOS draws.
 * While the app starts, iOS shows a launch image, and shows a blank screen when none of them matches
 * the device exactly: the size in CSS pixels, the pixel ratio and the orientation must all agree with
 * the link's media query. It ignores the manifest's `background_color` for this, so the build draws
 * one launch image for every screen Apple has sold. A model with a new size needs one line below.
 * Phones are drawn upright only: the game is a portrait column, and 13 more large pictures for the
 * rare phone launched on its side would slow every build for a flash of blank screen. Tablets turn
 * freely, so they get both.
 */

export interface Screen {
  /** CSS pixels, held upright. */
  width: number;
  height: number;
  /** Device pixels to one CSS pixel. */
  ratio: number;
  /** Phones are launched upright; tablets on either side. */
  kind: 'phone' | 'tablet';
  /** Who has this screen. */
  devices: string;
}

export const SCREENS: readonly Screen[] = [
  { width: 320, height: 568, ratio: 2, kind: 'phone', devices: 'iPhone SE (1st generation), iPhone 5s, iPod touch' },
  { width: 375, height: 667, ratio: 2, kind: 'phone', devices: 'iPhone 6, 6s, 7, 8, SE (2nd and 3rd generation)' },
  { width: 414, height: 736, ratio: 3, kind: 'phone', devices: 'iPhone 6 Plus, 6s Plus, 7 Plus, 8 Plus' },
  { width: 375, height: 812, ratio: 3, kind: 'phone', devices: 'iPhone X, XS, 11 Pro, 12 mini, 13 mini' },
  { width: 414, height: 896, ratio: 2, kind: 'phone', devices: 'iPhone XR, 11' },
  { width: 414, height: 896, ratio: 3, kind: 'phone', devices: 'iPhone XS Max, 11 Pro Max' },
  { width: 390, height: 844, ratio: 3, kind: 'phone', devices: 'iPhone 12, 12 Pro, 13, 13 Pro, 14, 16e' },
  { width: 428, height: 926, ratio: 3, kind: 'phone', devices: 'iPhone 12 Pro Max, 13 Pro Max, 14 Plus' },
  { width: 393, height: 852, ratio: 3, kind: 'phone', devices: 'iPhone 14 Pro, 15, 15 Pro, 16' },
  { width: 430, height: 932, ratio: 3, kind: 'phone', devices: 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus' },
  { width: 402, height: 874, ratio: 3, kind: 'phone', devices: 'iPhone 16 Pro, 17, 17 Pro' },
  { width: 440, height: 956, ratio: 3, kind: 'phone', devices: 'iPhone 16 Pro Max, 17 Pro Max' },
  { width: 420, height: 912, ratio: 3, kind: 'phone', devices: 'iPhone Air' },
  { width: 768, height: 1024, ratio: 2, kind: 'tablet', devices: 'iPad (5th and 6th generation), iPad mini 2 to 5, iPad Air 2, iPad Pro 9.7-inch' },
  { width: 810, height: 1080, ratio: 2, kind: 'tablet', devices: 'iPad (7th, 8th and 9th generation)' },
  { width: 834, height: 1112, ratio: 2, kind: 'tablet', devices: 'iPad Air (3rd generation), iPad Pro 10.5-inch' },
  { width: 744, height: 1133, ratio: 2, kind: 'tablet', devices: 'iPad mini (6th and 7th generation)' },
  { width: 820, height: 1180, ratio: 2, kind: 'tablet', devices: 'iPad (10th and 11th generation), iPad Air 10.9-inch and 11-inch' },
  { width: 834, height: 1194, ratio: 2, kind: 'tablet', devices: 'iPad Pro 11-inch (1st to 4th generation)' },
  { width: 834, height: 1210, ratio: 2, kind: 'tablet', devices: 'iPad Pro 11-inch (M4 and later)' },
  { width: 1024, height: 1366, ratio: 2, kind: 'tablet', devices: 'iPad Pro 12.9-inch, iPad Air 13-inch' },
  { width: 1032, height: 1376, ratio: 2, kind: 'tablet', devices: 'iPad Pro 13-inch (M4 and later)' },
];

export interface LaunchImage {
  /** Where the build writes it, relative to the site. */
  file: string;
  /** Its size in device pixels. */
  width: number;
  height: number;
  /** The media query iOS matches against the device. */
  media: string;
}

/**
 * The launch images for each screen. iOS reports `device-width` and `device-height` for the upright
 * screen in both orientations, and only `orientation` differs.
 */
export function launchImages(screens: readonly Screen[] = SCREENS): LaunchImage[] {
  return screens.flatMap((s) =>
    (s.kind === 'tablet' ? (['portrait', 'landscape'] as const) : (['portrait'] as const)).map((orientation) => {
      const upright = orientation === 'portrait';
      const width = (upright ? s.width : s.height) * s.ratio;
      const height = (upright ? s.height : s.width) * s.ratio;
      const media = `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: ${orientation})`;
      return { file: `splash/${width}x${height}.png`, width, height, media };
    }),
  );
}

/** The Home Screen icon sizes iOS draws: iPhone 180, iPad Pro 167, iPad 152, and older iPhones 120. */
export const TOUCH_ICON_SIZES = [180, 167, 152, 120] as const;

export function touchIconFile(size: number): string {
  return size === 180 ? 'icons/apple-touch-icon.png' : `icons/apple-touch-icon-${size}.png`;
}
