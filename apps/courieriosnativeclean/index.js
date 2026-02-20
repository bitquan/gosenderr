/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

const IOS_TARGET_NAME = 'Senderrappios';
const IOS_PRIMARY_MODULE = 'Senderr';
const iosModuleNames = new Set([IOS_PRIMARY_MODULE, IOS_TARGET_NAME, appName].filter(Boolean));

for (const moduleName of iosModuleNames) {
  AppRegistry.registerComponent(moduleName, () => App);
}
