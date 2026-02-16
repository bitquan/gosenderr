import {Platform} from 'react-native';

import type {NotificationPayload, NotificationsServicePort} from '../ports/notificationsPort';
import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';

type MessagingInstance = unknown;

type MessagingModule = {
  getMessaging?: () => MessagingInstance;
  requestPermission?: (
    messaging: MessagingInstance,
    permissions?: FirebaseMessagingTypes.IOSPermissions,
  ) => Promise<FirebaseMessagingTypes.AuthorizationStatus>;
  registerDeviceForRemoteMessages?: (messaging: MessagingInstance) => Promise<void>;
  getToken?: (
    messaging: MessagingInstance,
    options?: FirebaseMessagingTypes.GetTokenOptions & FirebaseMessagingTypes.NativeTokenOptions,
  ) => Promise<string>;
  onMessage?: (
    messaging: MessagingInstance,
    listener: (message: FirebaseMessagingTypes.RemoteMessage) => unknown,
  ) => () => void;
  AuthorizationStatus?: {
    AUTHORIZED: number;
    PROVISIONAL: number;
  };
};

let warningShown = false;

const getMessagingModule = (): MessagingModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/messaging') as MessagingModule;
  } catch {
    if (!warningShown) {
      warningShown = true;
      console.warn('[notifications] @react-native-firebase/messaging is unavailable; push features disabled.');
    }
    return null;
  }
};

const getMessagingInstance = (): {module: MessagingModule; instance: MessagingInstance} | null => {
  const module = getMessagingModule();
  if (!module?.getMessaging) {
    return null;
  }
  return {
    module,
    instance: module.getMessaging(),
  };
};

const isAuthorized = (status: number, module: MessagingModule): boolean => {
  const authorized = module.AuthorizationStatus?.AUTHORIZED;
  const provisional = module.AuthorizationStatus?.PROVISIONAL;
  if (typeof authorized === 'number' && typeof provisional === 'number') {
    return status === authorized || status === provisional;
  }
  return status > 0;
};

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

    const messagingRef = getMessagingInstance();
    if (!messagingRef?.module.requestPermission) {
      return false;
    }

    const status = await messagingRef.module.requestPermission(messagingRef.instance);
    return isAuthorized(status, messagingRef.module);
  },
  registerDeviceToken: async () => {
    if (Platform.OS !== 'ios') {
      return null;
    }

    const messagingRef = getMessagingInstance();
    if (!messagingRef?.module.registerDeviceForRemoteMessages || !messagingRef.module.getToken) {
      return null;
    }

    await messagingRef.module.registerDeviceForRemoteMessages(messagingRef.instance);
    const token = await messagingRef.module.getToken(messagingRef.instance);
    return token?.trim() ? token : null;
  },
  registerMessagingToken: async () => {
    if (Platform.OS !== 'ios') {
      return null;
    }

    const messagingRef = getMessagingInstance();
    if (!messagingRef?.module.registerDeviceForRemoteMessages || !messagingRef.module.getToken) {
      return null;
    }

    await messagingRef.module.registerDeviceForRemoteMessages(messagingRef.instance);
    const token = await messagingRef.module.getToken(messagingRef.instance);
    return token?.trim() ? token : null;
  },
  handleForegroundMessage: async payload => {
    // Keep this lightweight; UI can decide how to surface alerts.
    console.info('[notifications] foreground message', payload);
  },
  subscribeToForegroundMessages: onMessage => {
    const messagingRef = getMessagingInstance();
    if (!messagingRef?.module.onMessage) {
      return () => undefined;
    }

    return messagingRef.module.onMessage(messagingRef.instance, async message => {
      const payload = toNotificationPayload(message);
      await notificationsFirebaseAdapter.handleForegroundMessage(payload);
      onMessage(payload);
    });
  },
};
