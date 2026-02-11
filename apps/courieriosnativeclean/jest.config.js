module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:@react-native|react-native|@react-native-community|@react-navigation|@react-native-async-storage|@react-native-community\\+geolocation))',
  ],
};
