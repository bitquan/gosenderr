/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

messaging().setBackgroundMessageHandler(async () => {
  // Background message handling intentionally no-op; notification payloads are presented by iOS.
});

const IOS_TARGET_NAME = 'Senderrappios';
const IOS_PRIMARY_MODULE = 'Senderr';
const iosModuleNames = new Set([IOS_PRIMARY_MODULE, IOS_TARGET_NAME, appName].filter(Boolean));

for (const moduleName of iosModuleNames) {
  AppRegistry.registerComponent(moduleName, () => App);
}
