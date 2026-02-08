import {NativeModules, Platform} from 'react-native';

import type {NotificationsServicePort} from '../ports/notificationsPort';

type NotificationsNativeModule = {
  requestPermission: () => Promise<boolean>;
  registerDeviceToken: () => Promise<string | null>;
  registerMessagingToken: () => Promise<string | null>;
};

const nativeModule = NativeModules.SenderrNotificationsModule as NotificationsNativeModule | undefined;

export const notificationsNativeAdapter: NotificationsServicePort = {
  requestPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios' || !nativeModule?.requestPermission) {
      return false;
    }
    return nativeModule.requestPermission();
  },
  registerDeviceToken: async (): Promise<string | null> => {
    if (Platform.OS !== 'ios' || !nativeModule?.registerDeviceToken) {
      return null;
    }
    return nativeModule.registerDeviceToken();
  },
  registerMessagingToken: async (): Promise<string | null> => {
    if (Platform.OS !== 'ios' || !nativeModule?.registerMessagingToken) {
      return null;
    }
    return nativeModule.registerMessagingToken();
  },
  handleForegroundMessage: async () => undefined,
  subscribeToForegroundMessages: () => () => undefined,
};
