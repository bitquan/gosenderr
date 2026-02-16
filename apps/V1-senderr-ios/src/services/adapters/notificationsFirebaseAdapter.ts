import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {Platform} from 'react-native';

import type {NotificationPayload, NotificationsServicePort} from '../ports/notificationsPort';

const isAuthorized = (status: number): boolean =>
  status === messaging.AuthorizationStatus.AUTHORIZED ||
  status === messaging.AuthorizationStatus.PROVISIONAL;

const toNotificationPayload = (message: FirebaseMessagingTypes.RemoteMessage): NotificationPayload => ({
  title: message.notification?.title ?? 'Senderr update',
  body: message.notification?.body ?? '',
  data: Object.fromEntries(
    Object.entries(message.data ?? {}).map(([key, value]) => [key, String(value)]),
  ),
});

export const notificationsFirebaseAdapter: NotificationsServicePort = {
  requestPermission: async () => {
    if (Platform.OS !== 'ios') {
      return false;
    }

    const status = await messaging().requestPermission();
    return isAuthorized(status);
  },
  registerDeviceToken: async () => {
    if (Platform.OS !== 'ios') {
      return null;
    }

    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    return token?.trim() ? token : null;
  },
  registerMessagingToken: async () => {
    if (Platform.OS !== 'ios') {
      return null;
    }

    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    return token?.trim() ? token : null;
  },
  handleForegroundMessage: async payload => {
    // Keep this lightweight; UI can decide how to surface alerts.
    console.info('[notifications] foreground message', payload);
  },
  subscribeToForegroundMessages: onMessage =>
    messaging().onMessage(async message => {
      const payload = toNotificationPayload(message);
      await notificationsFirebaseAdapter.handleForegroundMessage(payload);
      onMessage(payload);
    }),
};
