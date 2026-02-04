const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

const config = {
	watchFolders: [workspaceRoot],
	resolver: {
		unstable_enableSymlinks: true,
		extraNodeModules: {
			react: path.join(appNodeModules, 'react'),
			'react-native': path.join(appNodeModules, 'react-native'),
			invariant: path.join(appNodeModules, 'invariant'),
			'@react-native/virtualized-lists': path.join(
				appNodeModules,
				'@react-native/virtualized-lists'
			),
			'@rnmapbox/maps': path.join(appNodeModules, '@rnmapbox/maps'),
		},
		nodeModulesPaths: [
			appNodeModules,
			path.resolve(workspaceRoot, 'node_modules'),
		],
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
