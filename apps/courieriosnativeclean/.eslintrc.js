/* eslint-env node */
/* global module */
module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Disable problematic rule until ESLint/@typescript-eslint toolchain is normalized across the mono-repo
    '@typescript-eslint/no-unused-expressions': 'off',
  },
  overrides: [
    {
      files: ['src/**/__tests__/**', 'src/**/__integration__/**'],
      rules: {
        // Tests frequently use `any` for mocks — allow it in test files to reduce noise
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
