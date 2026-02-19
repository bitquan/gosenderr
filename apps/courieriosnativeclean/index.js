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

AppRegistry.registerComponent(appName, () => App);
