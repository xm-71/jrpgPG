/*
 * Duskline's service worker: it keeps the whole game on the device, so it opens with no connection.
 *
 * The build (offline/plugin.ts) copies this file to dist/sw.js and fills in VERSION, a hash of every
 * cached file, and PRECACHE, the files themselves. A new build therefore always gets a new cache,
 * and old caches are deleted when it takes over.
 *
 * The game is one page, so every page load is answered with the cached shell, and every cached file
 * is answered from the cache first. A new version installs quietly in the background and waits: the
 * page offers it in Settings, so an update never swaps files under a fight in progress.
 */
'use strict';

const VERSION = /*VERSION*/ 'dev';
const PRECACHE = /*PRECACHE*/ [];

const PREFIX = 'duskline-';
const CACHE = PREFIX + VERSION;
const BASE = new URL('./', self.location.href);
const SHELL = new URL('index.html', BASE).href;
const URLS = new Set(PRECACHE.map((path) => new URL(path, BASE).href));

/** A response that was redirected cannot be used to answer a page load, so copy it plain. */
async function plain(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function precache() {
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(
      [...URLS].map(async (href) => {
        // Bypass the HTTP cache: a stale copy here would be cached for the life of this version.
        const response = await fetch(new Request(href, { cache: 'reload' }));
        if (!response.ok) throw new Error(href + ' answered ' + response.status);
        await cache.put(href, await plain(response));
      }),
    );
  } catch (error) {
    // A half-filled cache is worse than none: fail the install and keep the old version.
    await caches.delete(CACHE);
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  else if (data.type === 'VERSION' && event.source) event.source.postMessage({ type: 'VERSION', version: VERSION });
});

async function shell(request) {
  const hit = await caches.match(SHELL, { cacheName: CACHE });
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Duskline needs one visit with a connection before it can open offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function cached(request) {
  const hit = await caches.match(request.url, { cacheName: CACHE });
  return hit || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(shell(request));
  else if (URLS.has(url.href)) event.respondWith(cached(request));
  // Anything else (such as the downloadable offline copy) goes to the network as usual.
});
