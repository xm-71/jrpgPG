import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  // Relative asset paths so the build works from any sub-path or a file:// origin.
  base: './',
  plugins: [preact()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
