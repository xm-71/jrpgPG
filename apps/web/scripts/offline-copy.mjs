// Puts the single-file build beside the site as duskline-offline.html, the file the "Download offline
// copy" button saves. Run after both builds: `pnpm build:site` does all three.
import { copyFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const from = fileURLToPath(new URL('dist-single/index.html', root));
const to = fileURLToPath(new URL('dist/duskline-offline.html', root));

if (!existsSync(from)) throw new Error('dist-single/index.html is missing: run `pnpm build:single` first');
if (!existsSync(fileURLToPath(new URL('dist/', root)))) throw new Error('dist/ is missing: run `pnpm build` first');
copyFileSync(from, to);
console.log(`Offline copy: dist/duskline-offline.html (${(statSync(to).size / 1024 / 1024).toFixed(2)} MB)`);
