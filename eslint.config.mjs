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
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        game: 'readonly',
        Hooks: 'readonly',
        Babele: 'readonly',
        foundry: 'readonly',
        ui: 'readonly',
        FormApplication: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
