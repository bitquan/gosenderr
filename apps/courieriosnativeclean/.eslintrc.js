module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Disable problematic rule until ESLint/@typescript-eslint toolchain is normalized across the mono-repo
    '@typescript-eslint/no-unused-expressions': 'off',
  },
};
