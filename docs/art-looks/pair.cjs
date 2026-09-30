// node pair.cjs out a b [c d ...]: lays PNGs from out/ side by side at half size into out/<out>.png
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [name, ...imgs] = process.argv.slice(2);
  const w = +(process.env.PW || 400), h = Math.round(w * 1.25);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: imgs.length * w + (imgs.length - 1) * 6, height: h } });
  require("fs").writeFileSync(__dirname + "/out/_pair.html", `<body style="margin:0;background:#111;display:flex;gap:6px">${imgs.map((i) => `<img src="file://${__dirname}/out/${i}.png" style="width:${w}px;height:${h}px">`).join('')}</body>`); await page.goto("file://" + __dirname + "/out/_pair.html");
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${__dirname}/out/${name}.png` });
  await browser.close();
})();
