import { Application, Graphics } from 'pixi.js';
import { render } from 'preact';

// Temporary smoke test: proves the toolchain, Preact and PixiJS (WebGL) all work.
async function boot() {
  const host = document.getElementById('app')!;
  render(<p id="hello">Duskline pipeline check</p>, host);

  const app = new Application();
  await app.init({ width: 320, height: 200, background: '#1e1846', antialias: true, preference: 'webgl' });
  host.appendChild(app.canvas);
  app.stage.addChild(new Graphics().circle(160, 100, 50).fill(0xf2b43a));
  (window as unknown as { __renderer: string }).__renderer = app.renderer.name;
}

void boot();
