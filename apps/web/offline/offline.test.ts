import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { Resvg } from '@resvg/resvg-js';
import { afterEach, describe, expect, test } from 'vitest';
import { iconSvg, maskableIconSvg } from './icon.ts';
import { buildServiceWorker, manifest, precacheList, versionOf } from './plugin.ts';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, 'sw.js'), 'utf8');

// ---------------------------------------------------------------------------
// The build helpers
// ---------------------------------------------------------------------------

const dirs: string[] = [];
function site(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'duskline-site-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('what gets cached', () => {
  test('lists the files the game runs from, sorted, and leaves out maps, old fonts, the worker and the offline copy', () => {
    const dir = site({
      'index.html': '<html>',
      'sw.js': 'worker',
      'duskline-offline.html': 'copy',
      'manifest.webmanifest': '{}',
      '.DS_Store': 'x',
      'assets/index-1.js': 'js',
      'assets/index-1.js.map': 'map',
      'assets/font.woff': 'old',
      'assets/font.woff2': 'new',
      'icons/icon.svg': '<svg/>',
    });
    expect(precacheList(dir)).toEqual(['assets/font.woff2', 'assets/index-1.js', 'icons/icon.svg', 'index.html', 'manifest.webmanifest']);
  });

  test('the version changes with any file name or content, and not otherwise', () => {
    const a = site({ 'index.html': 'one', 'assets/a.js': 'a' });
    const b = site({ 'index.html': 'one', 'assets/a.js': 'a' });
    const c = site({ 'index.html': 'two', 'assets/a.js': 'a' });
    const d = site({ 'index.html': 'one', 'assets/b.js': 'a' });
    const v = (dir: string): string => versionOf(dir, precacheList(dir));
    expect(v(a)).toBe(v(b));
    expect(v(c)).not.toBe(v(a));
    expect(v(d)).not.toBe(v(a));
    expect(v(a)).toMatch(/^[0-9a-f]{12}$/);
  });

  test('the worker template takes its version and file list, and refuses a template that lost its placeholders', () => {
    const built = buildServiceWorker(template, ['index.html', 'assets/a.js'], 'abc123');
    expect(built).toContain('const VERSION = "abc123";');
    expect(built).toContain('const PRECACHE = ["index.html","assets/a.js"];');
    expect(() => buildServiceWorker('const nothing = 1;', [], 'x')).toThrow(/placeholder/);
  });
});

describe('the manifest and icons', () => {
  test('meets the install criteria: names, a start page, standalone display, and 192 and 512 icons', () => {
    const m = manifest() as { name: string; short_name: string; start_url: string; display: string; icons: Array<{ sizes: string; purpose: string; type: string; src: string }> };
    expect(m.name).toBe('Duskline');
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe('./');
    expect(m.display).toBe('standalone');
    const png = m.icons.filter((i) => i.type === 'image/png');
    expect(png.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true);
    expect(png.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true);
    expect(png.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
    for (const i of m.icons) expect(i.src.startsWith('icons/')).toBe(true);
  });

  test('both icon drawings render, at any size, to a picture that is not blank', () => {
    for (const svg of [iconSvg(), maskableIconSvg()]) {
      const image = new Resvg(svg, { fitTo: { mode: 'width', value: 96 }, font: { loadSystemFonts: false } }).render();
      expect(image.width).toBe(96);
      expect(image.height).toBe(96);
      const pixels = image.pixels;
      let bright = 0;
      let dark = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const light = (pixels[i]! + pixels[i + 1]! + pixels[i + 2]!) / 3;
        if (light > 120) bright++;
        else if (light < 40) dark++;
        expect(pixels[i + 3]).toBe(255);
      }
      expect(bright).toBeGreaterThan(20);
      expect(dark).toBeGreaterThan(1000);
    }
  });
});

// ---------------------------------------------------------------------------
// The service worker, run against a stand-in for the browser
// ---------------------------------------------------------------------------

type Handler = (event: any) => void;

function browser(files: string[], version = 'v1') {
  const stores = new Map<string, Map<string, Response>>();
  const handlers = new Map<string, Handler>();
  const network = new Map<string, () => Response | Promise<Response>>();
  const asked: Array<{ url: string; cache: string }> = [];
  let claimed = 0;
  let skipped = 0;

  const caches = {
    async open(name: string) {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return {
        async put(url: string, response: Response) {
          store.set(url, response);
        },
      };
    },
    async match(key: string | Request, options?: { cacheName?: string }) {
      const url = typeof key === 'string' ? key : key.url;
      const hit = options?.cacheName ? stores.get(options.cacheName)?.get(url) : [...stores.values()].map((s) => s.get(url)).find(Boolean);
      return hit?.clone();
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };
  async function fetchStandIn(input: string | Request): Promise<Response> {
    const request = typeof input === 'string' ? new Request(input) : input;
    asked.push({ url: request.url, cache: request.cache });
    const serve = network.get(request.url);
    if (!serve) throw new TypeError('Failed to fetch');
    return serve();
  }
  const self = {
    location: { href: 'https://play.test/game/sw.js', origin: 'https://play.test' },
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
    clients: { claim: async () => void claimed++ },
    skipWaiting: () => void skipped++,
  };
  runInNewContext(buildServiceWorker(template, files, version), { self, caches, fetch: fetchStandIn, Request, Response, URL, Set, Promise, TypeError, Error });

  const url = (path: string): string => `https://play.test/game/${path}`;
  return {
    url,
    stores,
    network,
    asked,
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
    /** Serve every listed file from the "network". */
    online(bodies: Record<string, string> = {}) {
      for (const f of files) network.set(url(f), () => new Response(bodies[f] ?? `body of ${f}`));
    },
    async lifecycle(type: 'install' | 'activate') {
      let done: Promise<unknown> = Promise.resolve();
      handlers.get(type)!({ waitUntil: (p: Promise<unknown>) => (done = p) });
      await done;
    },
    /** Send a request through the worker. Returns the response, or null when the worker left it alone. */
    async request(path: string, init: { mode?: string; method?: string; absolute?: boolean } = {}) {
      const href = init.absolute ? path : url(path);
      const request = Object.assign(new Request(href, { method: init.method ?? 'GET' }), {});
      Object.defineProperty(request, 'mode', { value: init.mode ?? 'no-cors' });
      let answer: Promise<Response> | null = null;
      handlers.get('fetch')!({ request, respondWith: (p: Promise<Response>) => (answer = p) });
      return answer ? await (answer as Promise<Response>) : null;
    },
    message(data: unknown) {
      const replies: unknown[] = [];
      handlers.get('message')!({ data, source: { postMessage: (m: unknown) => replies.push(m) } });
      return replies;
    },
  };
}

const FILES = ['index.html', 'assets/app.js', 'assets/app.css'];

describe('the service worker', () => {
  test('install saves every file, fetched past the HTTP cache, under a cache named for the version', async () => {
    const w = browser(FILES, 'v7');
    w.online();
    await w.lifecycle('install');
    expect([...w.stores.keys()]).toEqual(['duskline-v7']);
    expect([...w.stores.get('duskline-v7')!.keys()].sort()).toEqual(FILES.map(w.url).sort());
    expect(w.asked).toHaveLength(FILES.length);
    expect(w.asked.every((r) => r.cache === 'reload')).toBe(true);
  });

  test('install fails, and leaves nothing behind, when any file cannot be fetched', async () => {
    const w = browser(FILES);
    w.online();
    w.network.set(w.url('assets/app.js'), () => new Response('gone', { status: 404 }));
    await expect(w.lifecycle('install')).rejects.toThrow(/404/);
    expect(w.stores.size).toBe(0);
  });

  test('a redirected copy is stored as a plain response, which a page load can be answered with', async () => {
    const w = browser(FILES);
    w.online();
    const redirected = new Response('shell', { status: 200 });
    Object.defineProperty(redirected, 'redirected', { value: true });
    w.network.set(w.url('index.html'), () => redirected);
    await w.lifecycle('install');
    const stored = w.stores.get('duskline-v1')!.get(w.url('index.html'))!;
    expect(stored.redirected).toBe(false);
    expect(await stored.text()).toBe('shell');
  });

  test('activate deletes the caches of older versions and nothing else, then takes over open pages', async () => {
    const w = browser(FILES, 'v2');
    w.online();
    w.stores.set('duskline-v1', new Map());
    w.stores.set('duskline-old', new Map());
    w.stores.set('someone-elses', new Map());
    await w.lifecycle('install');
    await w.lifecycle('activate');
    expect([...w.stores.keys()].sort()).toEqual(['duskline-v2', 'someone-elses']);
    expect(w.claimed).toBe(1);
  });

  test('every page load gets the saved shell, whatever the address, with no connection', async () => {
    const w = browser(FILES);
    w.online({ 'index.html': 'the shell' });
    await w.lifecycle('install');
    w.network.clear();
    for (const path of ['', 'index.html', 'index.html?now=2026-09-29T10:00:00Z', 'anything/at/all']) {
      const response = await w.request(path, { mode: 'navigate' });
      expect(await response!.text()).toBe('the shell');
    }
  });

  test('saved files come from the cache, even with no connection', async () => {
    const w = browser(FILES);
    w.online({ 'assets/app.js': 'the script' });
    await w.lifecycle('install');
    w.network.clear();
    const response = await w.request('assets/app.js');
    expect(await response!.text()).toBe('the script');
  });

  test('the very first page load, before anything is saved, goes to the network, and says so plainly when there is none', async () => {
    const w = browser(FILES);
    w.network.set(w.url(''), () => new Response('live shell'));
    expect(await (await w.request('', { mode: 'navigate' }))!.text()).toBe('live shell');
    w.network.clear();
    const offline = await w.request('', { mode: 'navigate' });
    expect(offline!.status).toBe(503);
    expect(await offline!.text()).toMatch(/one visit with a connection/);
  });

  test('leaves alone whatever it did not save: other sites, other methods, and the downloadable offline copy', async () => {
    const w = browser(FILES);
    w.online();
    await w.lifecycle('install');
    expect(await w.request('https://elsewhere.test/game/assets/app.js', { absolute: true })).toBeNull();
    expect(await w.request('assets/app.js', { method: 'POST' })).toBeNull();
    expect(await w.request('duskline-offline.html')).toBeNull();
    expect(await w.request('assets/not-saved.js')).toBeNull();
  });

  test('a new version waits for the player: SKIP_WAITING is the only thing that lets it take over', async () => {
    const w = browser(FILES, 'v9');
    w.online();
    await w.lifecycle('install');
    expect(w.skipped).toBe(0);
    w.message({ type: 'SKIP_WAITING' });
    expect(w.skipped).toBe(1);
  });

  test('tells a page which version it is serving', () => {
    const w = browser(FILES, 'v9');
    expect(w.message({ type: 'VERSION' })).toEqual([{ type: 'VERSION', version: 'v9' }]);
    expect(w.message({ type: 'something else' })).toEqual([]);
  });
});
