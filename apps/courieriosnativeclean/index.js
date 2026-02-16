/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

const IOS_TARGET_NAME = 'Senderrappios';

AppRegistry.registerComponent(IOS_TARGET_NAME, () => App);

if (appName !== IOS_TARGET_NAME) {
  AppRegistry.registerComponent(appName, () => App);
}
