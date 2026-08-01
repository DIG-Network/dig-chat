import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

import { version } from './package.json';
import { injectAppVersion } from './src/renderer/version';

/**
 * Three builds from one config: main, preload, renderer.
 *
 * Main and preload are emitted as CommonJS, and that is a requirement rather than a preference. A
 * SANDBOXED preload — which is the only kind this app ships (`src/main/security.ts`) — cannot be an
 * ES module: Electron loads it in a restricted context with no module loader. And an ESM main
 * process has no `__dirname`, which is how the window finds the preload and the renderer HTML. Both
 * failures happen at RUNTIME, in a packaged build, long after a green CI run.
 *
 * The version is injected from `package.json` at build time (§6.7) rather than written anywhere by
 * hand — a literal in the HTML would drift from the manifest the first time someone bumped one and
 * not the other, and the bug reports would quietly start naming the wrong build.
 */
export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'src/main/index.ts'), formats: ['cjs'] },
      rollupOptions: { external: ['electron', 'ws'] },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        formats: ['cjs'],
      },
      rollupOptions: { external: ['electron'] },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [
      react(),
      {
        // `define` rewrites JavaScript, NOT HTML — so the meta tag needs its own pass. Without this
        // the document ships the literal placeholder, which reads as a real version to whoever
        // triages the bug report carrying it.
        name: 'dig-chat:app-version',
        transformIndexHtml: (html: string) => injectAppVersion(html, version),
      },
    ],
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
});
