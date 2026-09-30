// End-to-end smoke test: a new player climbs the Root for the first time, meets Io, kindles, reloads,
// and plays again with the connection cut. Then an iPhone-shaped browser checks the Home Screen app pieces.
// Run `pnpm build` first. Uses the Chromium that Playwright is configured to find (PLAYWRIGHT_BROWSERS_PATH)
// or CHROMIUM_PATH. Falls back to /opt/pw-browsers/chromium when it exists.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 4180;
const GAME_URL = `http://127.0.0.1:${PORT}/?now=2026-09-29T10:00:00Z`;
const webDir = new URL('../../apps/web/', import.meta.url).pathname;

if (!existsSync(`${webDir}dist/index.html`)) {
  console.error('Build first: pnpm build');
  process.exit(2);
}

const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: webDir, stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(GAME_URL);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Preview server did not start');
}

const errors = [];
const check = (cond, msg) => {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`ok  ${msg}`);
};

const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('duskline:profile') ?? 'null'));
const shown = async (page, sel) => (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());

/** The pixel size of a PNG, read from its header. */
async function pngSize(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const b = Buffer.from(await res.arrayBuffer());
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${url} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/**
 * What iOS needs to make the site an app: an icon and a launch image the size of each screen, and
 * touch, layout and guidance that suit an installed game. An iPhone-shaped Chromium stands in for
 * Safari (there is no WebKit here), with real safe-area insets for the status bar and home indicator.
 */
async function iosChecks(browser) {
  const html = await (await fetch(GAME_URL)).text();
  const tags = (re) => [...html.matchAll(re)].map((m) => m[0]);
  const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

  const icons = tags(/<link rel="apple-touch-icon"[^>]*>/g);
  check(icons.length >= 3, `the page names ${icons.length} Home Screen icon sizes`);
  for (const tag of icons) {
    const size = attr(tag, 'sizes').split('x').map(Number);
    const got = await pngSize(new URL(attr(tag, 'href'), GAME_URL));
    check(got.width === size[0] && got.height === size[1], `icon ${attr(tag, 'href')} is ${got.width}x${got.height}, as its link says`);
  }

  const launches = tags(/<link rel="apple-touch-startup-image"[^>]*>/g);
  check(launches.length >= 30, `the page names ${launches.length} launch images`);
  let wrong = [];
  const seen = new Set();
  for (const tag of launches) {
    const m = attr(tag, 'media').match(/device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\) and \(orientation: (portrait|landscape)\)/);
    if (!m) throw new Error('unreadable launch image media query: ' + attr(tag, 'media'));
    const [w, h, r] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const want = m[4] === 'portrait' ? { width: w * r, height: h * r } : { width: h * r, height: w * r };
    const got = await pngSize(new URL(attr(tag, 'href'), GAME_URL));
    if (got.width !== want.width || got.height !== want.height) wrong.push(`${attr(tag, 'href')} is ${got.width}x${got.height}, wanted ${want.width}x${want.height}`);
    seen.add(`${w}x${h}@${r}`);
  }
  check(wrong.length === 0, `every launch image is the exact pixel size its media query asks for${wrong.length ? ': ' + wrong.join('; ') : ''}`);
  for (const screen of ['402x874@3', '440x956@3', '420x912@3', '393x852@3', '390x844@3', '1032x1376@2']) check(seen.has(screen), `a launch image exists for ${screen}`);
  const metas = Object.fromEntries(tags(/<meta name="[^"]*" content="[^"]*"[^>]*>/g).map((t) => [attr(t, 'name'), attr(t, 'content')]));
  check(metas['apple-mobile-web-app-capable'] === 'yes' && metas['apple-mobile-web-app-status-bar-style'] === 'black-translucent' && metas['apple-mobile-web-app-title'] === 'Duskline', 'iOS is asked to open it as a full-screen app called Duskline');
  check(/viewport-fit=cover/.test(metas.viewport) && /telephone=no/.test(metas['format-detection']), 'the page runs edge to edge, and iOS is told not to turn numbers into phone links');

  const phone = { viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
  const insets = { top: 62, bottom: 34, left: 0, right: 0 };
  const open = async (standalone) => {
    const c = await browser.newContext(phone);
    if (standalone) await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const pg = await c.newPage();
    (await c.newCDPSession(pg)).send('Emulation.setSafeAreaInsetsOverride', { insets });
    pg.on('pageerror', (e) => errors.push('ios: ' + e.message));
    await pg.goto(GAME_URL);
    await pg.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 });
    return { c, pg };
  };

  // In Safari: the steps.
  {
    const { c, pg } = await open(false);
    check(await pg.evaluate(() => !document.documentElement.hasAttribute('data-standalone')), 'a browser tab is not treated as an installed app');
    await pg.getByRole('button', { name: 'Add to Home Screen' }).tap();
    await pg.locator('.sheet .steps li').first().waitFor();
    check((await pg.locator('.sheet .steps li').count()) === 3, 'Add to Home Screen opens the three steps');
    await pg.getByRole('button', { name: 'Got it' }).tap();
    await pg.locator('.title-actions .btn-ghost', { hasText: 'Settings' }).tap();
    await pg.locator('.offline-steps').waitFor();
    check(/Add to Home Screen/.test(await pg.locator('.offline-steps').innerText()), 'Settings carries the steps too');
    await c.close();
  }

  // As the app: standalone touch, safe areas, guidance, and no sideways play.
  {
    const { c, pg } = await open(true);
    check(await pg.evaluate(() => document.documentElement.hasAttribute('data-standalone')), 'the installed app is recognised');
    check((await pg.getByRole('button', { name: 'Add to Home Screen' }).count()) === 0, 'and does not offer to add itself');
    await pg.locator('.pill-note', { hasText: 'Played in Safari before' }).waitFor();
    check(true, 'its first launch says where a Safari save went');
    check(await pg.evaluate(() => { const e = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; }), 'a pinch is cancelled, so the fixed layout cannot be zoomed and stranded');
    check((await pg.evaluate(() => getComputedStyle(document.body).userSelect)) === 'none', 'its controls do not start a text selection');
    const top = await pg.evaluate(() => Math.round(document.querySelector('.title-logo').getBoundingClientRect().top));
    const bottom = await pg.evaluate(() => Math.round(Math.max(...[...document.querySelectorAll('.title-actions > *')].map((e) => e.getBoundingClientRect().bottom))));
    check(top >= insets.top && bottom <= 874 - insets.bottom, `the title clears the status bar and home indicator (${top}px from the top, ends ${874 - bottom}px from the bottom)`);
    await pg.locator('.title-actions .btn-ghost', { hasText: 'Settings' }).tap();
    await pg.getByRole('button', { name: 'Paste a save' }).tap();
    check((await pg.getByLabel('Save data').evaluate((e) => getComputedStyle(e).fontSize)) === '16px', 'the paste box is 16px, so iOS does not zoom the page when it is focused');
    await pg.getByRole('button', { name: 'Back' }).tap();
    check((await pg.evaluate(() => getComputedStyle(document.querySelector('.turn-upright')).display)) === 'none', 'held upright, there is no turn-upright cover');
    await pg.setViewportSize({ width: 874, height: 402 });
    await pg.waitForTimeout(200);
    check((await pg.evaluate(() => getComputedStyle(document.querySelector('.turn-upright')).display)) === 'flex', 'held sideways, the phone is asked to turn upright');
    await c.close();
  }
}

/** Fights on Auto and returns true for a win. */
async function fight(page) {
  const auto = page.locator('.bt-top button[aria-pressed="false"]', { hasText: 'Auto' });
  await page.locator('.bt-hand').waitFor();
  if (await auto.count()) await auto.click();
  await page.locator('.bt-result').waitFor({ timeout: 120000 });
  const won = (await page.locator('.bt-result h2').innerText()).toLowerCase().includes('victory');
  await page.locator('.bt-result .btn-primary').click();
  return won;
}

/**
 * Plays one step of the climb from whatever screen is up. Goes to places in a fixed order of preference,
 * so the same build always walks the same path through the tutorial seed.
 */
async function climbStep(page, log) {
  if (await shown(page, '.results')) return 'results';
  if (await shown(page, '.screen.battle')) {
    log.push(`fight:${(await fight(page)) ? 'won' : 'lost'}`);
  } else if (await shown(page, '.glimmer')) {
    await page.locator('.glimmer').first().click();
    log.push('glimmer');
  } else if (await shown(page, '.mirror')) {
    await page.locator('.mirror .cardf').first().click();
    log.push('mirror');
  } else if (await shown(page, '.pick-grid')) {
    await page.locator('.pick-grid .cardf').first().click();
    log.push('pick');
  } else if (await shown(page, '.shop')) {
    await page.getByRole('button', { name: 'Leave the market' }).click();
    log.push('shop');
  } else if (await shown(page, '.rest')) {
    await page.getByRole('button', { name: /Sleep/ }).click();
    log.push('rest');
  } else if (await shown(page, '.event')) {
    if (await shown(page, '.event-after')) await page.locator('.foot .btn-primary').click();
    else await page.locator('.event-choice:not([disabled])').last().click();
    log.push('event');
  } else if (await shown(page, '.offer-cards')) {
    await page.locator('.offer-cards .cardf').first().click();
    log.push('card');
  } else if (await shown(page, '.climb-map')) {
    for (const kind of ['rest', 'shop', 'mirror', 'battle', 'event', 'elite', 'guardian', 'boss']) {
      const node = page.locator(`.map-node.open.k-${kind}`);
      if (await node.count()) {
        await node.first().click();
        break;
      }
    }
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    log.push('go');
  }
  await page.waitForTimeout(120);
  return 'climbing';
}

try {
  await waitForServer();
  const started = Date.now();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/ERR_CERT|fonts\.g|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(GAME_URL);

  // Settings first: reduced motion keeps the fights quick.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
  await page.getByRole('button', { name: 'Back' }).click();

  // The prologue, then straight up the tower with Wren.
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.locator('.dialogue').click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.locator('.glimmer').first().waitFor();
  let p = await saved(page);
  check(p.v === 2 && p.climb.run?.hero === 'wren' && p.climb.run.seed === 'hush', 'the first climb starts with Wren on the tutorial seed');
  check(p.climb.run.deck.length === 8, 'Wren starts with 8 cards');
  await page.locator('.glimmer').first().click();

  // First fight and its spoils.
  await page.locator('.map-node.open.k-battle').first().click();
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  check(await fight(page), 'the first fight is won');
  await page.locator('.offer-cards .cardf').first().waitFor();
  check((await page.locator('.offer-cards .cardf').count()) === 3, 'a win offers three cards');
  await page.locator('.offer-cards .cardf').first().click();
  await page.locator('.climb-map').waitFor();
  p = await saved(page);
  check(p.climb.run.deck.length === 9 && p.climb.run.embers > 0, `the card joins the deck and Embers are paid (${p.climb.run.embers})`);

  // A reload mid-climb resumes where it left off.
  const at = p.climb.run.at;
  await page.reload();
  await page.getByRole('button', { name: 'Resume the climb' }).click();
  await page.locator('.climb-map').waitFor();
  check((await saved(page)).climb.run.at === at, 'a reload resumes the climb on the same node');

  // Climb to the end of the Root.
  const log = [];
  for (let i = 0; i < 400 && (await climbStep(page, log)) !== 'results'; i++);
  check(await shown(page, '.results'), `the climb reaches its results (${log.join(' ')})`);
  const cleared = (await page.locator('.results h2').innerText()).includes('cleared');
  console.log(`    ${cleared ? 'the Root is cleared' : 'the light went out'} after ${log.filter((l) => l.startsWith('fight')).length + 1} fights`);
  const gloamBefore = (await saved(page)).gloam;
  await page.getByRole('button', { name: 'Collect' }).click();
  await page.getByRole('button', { name: 'Continue' }).waitFor();
  p = await saved(page);
  check(p.climb.run === null && p.climb.runs === 1 && p.gloam > gloamBefore, `the climb settles and pays Gloam (${gloamBefore} to ${p.gloam})`);
  if (await page.locator('.keep .cardf').count()) {
    await page.locator('.keep .cardf').first().click();
    check((await saved(page)).archive.length === 1, 'an Echo from the climb is kept');
  }
  await page.getByRole('button', { name: 'Continue' }).click();

  // The story answers: the Gloamstone is lit for free and Io steps out.
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Kindle' }).click();
  await page.locator('.kindle-first h2', { hasText: 'Io' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (let i = 0; i < 8 && !(await shown(page, '.home')); i++) {
    if (await shown(page, '.dialogue')) await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForTimeout(250);
  }
  await page.locator('.home').waitFor();
  p = await saved(page);
  check(!!p.collection.heroes.io && p.progress.beats.includes('answering-lamp'), 'Io joins after the first climb');

  // Kindling: a ten-pull never costs more than 1000 Gloam.
  const gloamText = async () => Number((await page.locator('.topbar .gloam').first().innerText()).replace(/\D/g, ''));
  await page.getByRole('button', { name: /^Kindling/ }).click();
  const before = await gloamText();
  check(before >= 1000, `enough Gloam for a ten-pull (${before})`);
  await page.getByRole('button', { name: /Kindle ×10/ }).click();
  for (let i = 0; i < 14 && !(await page.locator('.kx-summary').count()); i++) {
    await page.locator('.kx-overlay').click();
    await page.waitForTimeout(100);
  }
  await page.locator('.kx-summary').waitFor();
  await page.getByRole('button', { name: 'Done' }).click();
  const after = await gloamText();
  check(before - after > 0 && before - after <= 1000, `a ten-pull costs at most 1000 Gloam (${before} to ${after}; duplicates may refund)`);

  // A reload keeps everything.
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('.home').waitFor();
  p = await saved(page);
  check(p.climb.runs === 1 && p.kindling.totalPulls === 10 && !!p.collection.heroes.io, 'climbs, pulls and heroes survive a reload');

  // Offline: the first visit saved the game on the device, so it opens and plays with no connection.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls = (await (await caches.open(keys[0])).keys()).map((r) => new URL(r.url).pathname);
    return { keys, urls };
  });
  check(cached.keys.length === 1 && cached.urls.includes('/index.html') && cached.urls.some((u) => u.endsWith('.woff2')) && cached.urls.length >= 20, `the game is saved on the device (${cached.urls.length} files)`);
  check(!cached.urls.some((u) => u.startsWith('/splash/')) && cached.urls.some((u) => u.includes('apple-touch-icon')), 'the launch images stay out of the offline cache, and the Home Screen icons are in it');
  const failedRequests = [];
  page.on('requestfailed', (r) => failedRequests.push(r.url()));
  await ctx.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('.home').waitFor();
  await page.locator('.cta-climb').click();
  await page.getByRole('button', { name: /^Enter/ }).click();
  await page.locator('.glimmer').first().click();
  await page.locator('.map-node.open').first().click();
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await page.locator('.bt-hand .cardf').first().waitFor({ timeout: 30000 });
  check(true, 'with no connection, the game reloads and a fight starts');
  check(failedRequests.filter((u) => u.startsWith(`http://127.0.0.1:${PORT}`)).length === 0, 'nothing the game needs was fetched from the network');
  await ctx.setOffline(false);

  await iosChecks(browser);

  check(errors.length === 0, `no console or page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(`\nAll end-to-end checks passed in ${Math.round((Date.now() - started) / 1000)} s.`);
  stop();
} catch (e) {
  console.error(e.message ?? e);
  if (errors.length) console.error('Page errors:', errors.join(' | '));
  stop();
  process.exit(1);
}
