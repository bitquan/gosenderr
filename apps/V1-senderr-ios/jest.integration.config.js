/* eslint-env node */
/* global module */
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@react-native-community/geolocation$': '<rootDir>/__mocks__/@react-native-community/geolocation.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(?:@react-native|react-native|@react-native-community|@react-navigation|@react-native-async-storage|@react-native-community\\+geolocation|firebase|@firebase|uuid)).*',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/src/services/__integration__/**/*.integration.test.ts'],
  collectCoverageFrom: [
    'src/services/authService.ts',
    'src/services/jobsService.ts',
    'src/services/locationService.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 10,
      functions: 20,
      lines: 20,
    },
  },
};
