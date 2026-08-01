import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Warnings are errors in CI (`--max-warnings 0`), so anything below that is worth reporting at all
 * blocks a merge. The complexity and length limits are the mechanical half of the readable-code bar:
 * a function that outgrows them is asking to be split, and the lint says so before a reviewer has to.
 */
export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': ['error', { max: 120, skipComments: true, skipBlankLines: true }],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // CommonJS tool configs run in Node, where `module` is defined; the browser-ish default globals
    // do not describe them.
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable' } },
  },
  {
    // Tests reach for non-null assertions and long describe blocks by nature; neither is a smell there.
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
