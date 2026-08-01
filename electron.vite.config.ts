import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

import { version } from './package.json';

/**
 * Three builds from one config: main, preload, renderer.
 *
 * The version is injected from `package.json` at build time (§6.7) rather than written anywhere by
 * hand — a literal in the HTML would drift from the manifest the first time someone bumped one and
 * not the other, and the bug reports would quietly start naming the wrong build.
 */
export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'src/main/index.ts') },
      rollupOptions: { external: ['electron', 'ws'] },
    },
  },
  preload: {
    build: { lib: { entry: resolve(__dirname, 'src/preload/index.ts') } },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
});
