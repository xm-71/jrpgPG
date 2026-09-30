// node render.cjs name1 name2 ... : renders out/<name>.svg to out/<name>.png with Chromium.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const names = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const n of names) {
    const svgText = fs.readFileSync(`${__dirname}/out/${n}.svg`, 'utf8');
    const m = svgText.match(/width="(\d+)" height="(\d+)"/);
    const w = +m[1], h = +m[2];
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:#000">${svgText}</body></html>`);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${__dirname}/out/${n}.png`, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await browser.close();
  console.log('rendered', names.join(' '));
})();
