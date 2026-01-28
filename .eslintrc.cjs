module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/*.config.ts', '**/*.config.mjs', 'apps/**/dist/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    // Relax rules to match current repo approach (reduce noisy CI failures)
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-unused-vars': 'off',
    'react/no-unescaped-entities': 'off',
    'prefer-const': 'warn',
    // modern JSX transform doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
    // allow TypeScript `// @ts-ignore` in exceptional cases
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      // Only enable type-aware linting for library/source files, not test/config files
      files: ['apps/*/src/**/*.ts', 'apps/*/src/**/*.tsx', 'packages/**/src/**/*.ts', 'packages/**/src/**/*.tsx'],
      parserOptions: { project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json'] },
    },

    // Test files and config scripts shouldn't require type-aware linting
    {
      files: ['**/tests/**', 'tests/**', 'apps/**/tests/**', 'tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
      // Clear project to avoid requiring tsconfig to include test files
      parserOptions: { project: [] },
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
    {
      files: ['tests/**', 'scripts/**'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
};
