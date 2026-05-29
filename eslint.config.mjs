import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dnd-simplified-chinese-babele-patch/scripts/**',
      'tools/*.mjs',
    ],
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.mjs'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        game: 'readonly',
        Hooks: 'readonly',
        Babele: 'readonly',
        foundry: 'readonly',
        ui: 'readonly',
        FormApplication: 'readonly',
        JQuery: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
