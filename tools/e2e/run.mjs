// End-to-end smoke test: a new player climbs the Root for the first time, meets Io, kindles, reloads,
// and plays again with the connection cut.
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
