import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One test project covering both halves of the app. The renderer needs a DOM, the main process does
 * not, so the environment is chosen per file by `environmentMatchGlobs` rather than by splitting the
 * suite into two runs that could drift apart in configuration.
 *
 * The coverage floor is the ecosystem's ≥80% (CLAUDE.md §2.3), enforced on lines AND branches so a
 * suite that executes every line without ever taking an error path cannot satisfy it.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['tests/renderer/**', 'jsdom']],
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Electron bootstrap: creating a BrowserWindow and wiring app lifecycle events. It is
        // configuration, it cannot run outside a packaged Electron process, and every DECISION it
        // makes (the webPreferences hardening, the CSP) is asserted from `tests/main/security` by
        // importing the values it applies rather than by launching a window.
        'src/main/index.ts',
        // The React entry point — three lines of `createRoot(...).render(...)`.
        'src/renderer/main.tsx',
        // Type-only modules carry no statements to cover.
        'src/**/types.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
