import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { offlinePlugin } from './offline/plugin.ts';

export default defineConfig({
  // Relative asset paths so the build works from any sub-path or a file:// origin.
  base: './',
  // The site is an installable app that plays offline: see offline/plugin.ts.
  plugins: [preact(), offlinePlugin()],
  define: { __SINGLE_FILE__: 'false' },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
