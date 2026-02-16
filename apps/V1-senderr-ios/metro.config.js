/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/* global module, require, __dirname */
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const extraNodeModules = {
  react: path.resolve(__dirname, '../..', 'node_modules', 'react'),
  'react-native': path.resolve(
    __dirname,
    '../..',
    'node_modules',
    'react-native',
  ),
  '@gosenderr/contracts': path.resolve(
    __dirname,
    '../..',
    'packages',
    'contracts',
    'src',
    'index.ts',
  ),
};

const config = {
  watchFolders: [
    path.resolve(__dirname, '../..', 'node_modules'),
    path.resolve(__dirname, '../..', 'packages', 'contracts'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../..', 'node_modules'),
    ],
    extraNodeModules,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
