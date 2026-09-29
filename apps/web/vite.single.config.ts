import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** One self-contained HTML file (script, styles and fonts inlined), for sharing a playable build. */
export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile()],
  build: {
    target: 'es2022',
    outDir: 'dist-single',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
