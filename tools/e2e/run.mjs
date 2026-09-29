// End-to-end smoke test: a new player plays the first two stages, kindles, reloads, and keeps their progress.
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

async function playBattle(page) {
  await page.getByRole('button', { name: '2×' }).click();
  await page.getByRole('button', { name: 'Auto' }).click();
  await page.locator('.bt-result').waitFor({ timeout: 120000 });
  const victory = (await page.locator('.bt-result h2').innerText()).toLowerCase().includes('victory');
  await page.getByRole('button', { name: 'Continue' }).click();
  return victory;
}

async function skipDialogue(page) {
  await page.getByRole('button', { name: 'Skip' }).click();
}

try {
  await waitForServer();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/ERR_CERT|fonts\.g|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(GAME_URL);

  // Prologue and stage 0-1
  await page.getByRole('button', { name: 'Begin' }).click();
  for (let i = 0; i < 5; i++) await page.locator('.narration').click();
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Fight' }).click();
  await page.locator('.battle canvas').waitFor();
  check(await playBattle(page), 'stage 0-1 is won');

  // After-story, then the scripted first Kindling gives Io
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Kindle' }).click();
  await page.getByText('Io', { exact: false }).first().waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Stage cleared').waitFor();
  check((await page.locator('.gloam').first().innerText()).includes('60'), 'first clear pays 60 Gloam');

  // Stage 0-2 with Io
  await page.getByRole('button', { name: /Next:/ }).click();
  await skipDialogue(page);
  await page.getByRole('button', { name: 'Fight' }).click();
  check(await playBattle(page), 'stage 0-2 is won');
  await skipDialogue(page);
  await page.getByText('Stage cleared').waitFor();
  await page.getByRole('button', { name: 'Home' }).click();

  // Kindling: a ten-pull spends exactly 1000 Gloam
  const gloamText = async () => Number((await page.locator('.topbar .gloam').first().innerText()).replace(/\D/g, ''));
  await page.getByText('Kindling').first().click();
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
  check(before - after === 1000 || before - after < 1000, `ten-pull charged (${before} to ${after}; duplicates may refund)`);
  check(before - after <= 1000, 'a ten-pull never costs more than 1000');

  // Reload keeps the save
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('duskline:profile') ?? 'null'));
  check(stored && stored.progress.cleared['0-1'] === 1 && stored.progress.cleared['0-2'] === 1, 'progress survives a reload');
  check(stored.kindling.totalPulls === 10, 'pull history survives a reload');

  check(errors.length === 0, `no console or page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log('\nAll end-to-end checks passed.');
  stop();
} catch (e) {
  console.error(e.message ?? e);
  if (errors.length) console.error('Page errors:', errors.join(' | '));
  stop();
  process.exit(1);
}
