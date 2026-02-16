/* eslint-env node */
/* global module */
module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
  },
  // ignore Playwright e2e files from Jest and allowlist packages that must be transformed by babel-jest
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@react-native-community/geolocation$': '<rootDir>/__mocks__/@react-native-community/geolocation.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(?:@react-native|react-native|@react-native-community|@react-navigation|@react-native-async-storage|@react-native-community\\+geolocation|firebase|@firebase|uuid)).*',
  ],
};
