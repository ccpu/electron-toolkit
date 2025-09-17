import baseConfig from '@internal/eslint-config/react';

/** @type {import('typescript-eslint').Config} */
export default [
  ...baseConfig,
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'test/**/*.ts', 'test/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },
  // { ignores: ['**/*.md'] }
];
