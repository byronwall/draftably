import js from '@eslint/js';
import solid from 'eslint-plugin-solid/configs/typescript';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-cli', 'reference', 'tmp', 'src/engines/*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ...solid,
    languageOptions: { globals: globals.browser, parserOptions: { project: './tsconfig.json' } },
    rules: {
      ...solid.rules,
      // Edits run their callback immediately, like an event handler.
      'solid/reactivity': ['warn', { customReactiveFunctions: ['edit', 'transact'] }],
      // Solid assigns `let el!: T` element refs through JSX, which this rule cannot see.
      'no-unassigned-vars': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**', 'scripts/**', 'src/cli/**', 'src/server/**', '*.config.*'],
    languageOptions: { globals: globals.node },
  },
);
