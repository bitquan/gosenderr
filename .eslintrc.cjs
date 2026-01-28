module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'public/',
    '*.config.js',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-empty': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: {
        // point to per-package tsconfigs to avoid requiring a root tsconfig
        project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json'],
      }
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off'
      }
    }
  ]
};
