/* eslint-env node */
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:@react-native|react-native|@react-native-community|@react-navigation|@react-native-async-storage|@react-native-community\\+geolocation))',
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
