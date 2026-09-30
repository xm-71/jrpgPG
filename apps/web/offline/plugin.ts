import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { iconSvg, maskableIconSvg } from './icon.ts';
import { launchImages, TOUCH_ICON_SIZES, touchIconFile } from './ios.ts';
import { splashSvg } from './splash.ts';

/**
 * Makes the production build an installable app that plays with no connection. After Vite has
 * written the site, this adds the icons (rendered from one SVG), the launch images iOS shows while a
 * Home Screen app starts (see ios.ts), the web manifest and the service worker, and points the page at
 * them. Nothing here runs in `vite dev`, and the single-file build does not use it.
 */

export const APP = {
  name: 'Duskline',
  description: 'A tower-climbing card game. Hold three cards, break the Fades, climb the Gnomon. Plays offline once installed.',
  themeColor: '#0D0B13',
  backgroundColor: '#07060B',
} as const;

/**
 * Files that are never worth caching: debugging maps, the older font format, the worker itself, the
 * on-request offline copy, and the launch images (iOS takes the one that fits when the app is added to
 * the Home Screen, and the rest would only fill the device).
 */
const SKIP = [/\.map$/, /\.woff$/, /^sw\.js$/, /^duskline-offline\.html$/, /^splash\//, /(^|\/)\.[^/]*$/];

/** Every file under `dir` the game needs to run, as sorted `/`-separated paths relative to it. */
export function precacheList(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.filter((f) => !SKIP.some((re) => re.test(f))).sort();
}

/** A short version that changes whenever any cached file's name or content does. */
export function versionOf(dir: string, files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update('\0').update(readFileSync(join(dir, f))).update('\0');
  return hash.digest('hex').slice(0, 12);
}

/** Fill the placeholders in the service worker template. Throws if the template no longer has them. */
export function buildServiceWorker(template: string, files: readonly string[], version: string): string {
  const v = "/*VERSION*/ 'dev'";
  const p = '/*PRECACHE*/ []';
  if (!template.includes(v) || !template.includes(p)) throw new Error('offline/sw.js is missing its VERSION or PRECACHE placeholder');
  return template.replace(v, JSON.stringify(version)).replace(p, JSON.stringify(files));
}

export function manifest(): Record<string, unknown> {
  const icon = (file: string, size: string, purpose: 'any' | 'maskable', type = 'image/png'): Record<string, string> => ({ src: `icons/${file}`, sizes: size, type, purpose });
  return {
    id: 'duskline',
    name: APP.name,
    short_name: APP.name,
    description: APP.description,
    lang: 'en',
    dir: 'ltr',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP.backgroundColor,
    theme_color: APP.themeColor,
    categories: ['games'],
    icons: [icon('icon-192.png', '192x192', 'any'), icon('icon-512.png', '512x512', 'any'), icon('maskable-512.png', '512x512', 'maskable'), icon('icon.svg', 'any', 'any', 'image/svg+xml')],
  };
}

/** Write the app icons and the iOS launch images. Rendering needs a native module, so a machine without it gets a warning, not a failed build. */
async function writeIcons(dir: string, warn: (message: string) => void): Promise<void> {
  const icons = join(dir, 'icons');
  mkdirSync(icons, { recursive: true });
  writeFileSync(join(icons, 'icon.svg'), iconSvg());
  try {
    const { Resvg } = await import('@resvg/resvg-js');
    const png = (svg: string, size: number): Buffer => Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng());
    writeFileSync(join(icons, 'icon-192.png'), png(iconSvg(), 192));
    writeFileSync(join(icons, 'icon-512.png'), png(iconSvg(), 512));
    writeFileSync(join(icons, 'maskable-512.png'), png(maskableIconSvg(), 512));
    for (const size of TOUCH_ICON_SIZES) writeFileSync(join(dir, touchIconFile(size)), png(iconSvg(), size));
    mkdirSync(join(dir, 'splash'), { recursive: true });
    for (const image of launchImages()) writeFileSync(join(dir, image.file), png(splashSvg(image.width, image.height), image.width));
  } catch (error) {
    warn(`Could not render the PNG app icons and launch images (${(error as Error).message}). The app still installs from icon.svg on most browsers, but iOS needs the PNGs.`);
  }
}

export function offlinePlugin(): Plugin {
  let outDir = '';
  let warn: (message: string) => void = console.warn;
  const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'sw.js'), 'utf8');
  return {
    name: 'duskline-offline',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      warn = (m) => config.logger.warn(m);
    },
    transformIndexHtml() {
      const link = (rel: string, href: string, extra: Record<string, string> = {}) => ({ tag: 'link', attrs: { rel, href, ...extra }, injectTo: 'head' as const });
      const meta = (name: string, content: string) => ({ tag: 'meta', attrs: { name, content }, injectTo: 'head' as const });
      return [
        link('manifest', 'manifest.webmanifest'),
        link('icon', 'icons/icon.svg', { type: 'image/svg+xml' }),
        ...TOUCH_ICON_SIZES.map((size) => link('apple-touch-icon', touchIconFile(size), { sizes: `${size}x${size}` })),
        meta('mobile-web-app-capable', 'yes'),
        meta('apple-mobile-web-app-capable', 'yes'),
        meta('apple-mobile-web-app-title', APP.name),
        meta('apple-mobile-web-app-status-bar-style', 'black-translucent'),
        ...launchImages().map((image) => link('apple-touch-startup-image', image.file, { media: image.media })),
      ];
    },
    async closeBundle() {
      await writeIcons(outDir, warn);
      writeFileSync(join(outDir, 'manifest.webmanifest'), `${JSON.stringify(manifest(), null, 2)}\n`);
      const files = precacheList(outDir);
      const version = versionOf(outDir, files);
      writeFileSync(join(outDir, 'sw.js'), buildServiceWorker(template, files, version));
      console.log(`\nOffline: ${files.length} files cached by service worker ${version}`);
    },
  };
}
