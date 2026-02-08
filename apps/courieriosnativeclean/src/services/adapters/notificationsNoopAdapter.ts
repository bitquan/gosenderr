import type {NotificationsServicePort} from '../ports/notificationsPort';

export const notificationsNoopAdapter: NotificationsServicePort = {
  requestPermission: async () => false,
  registerDeviceToken: async () => null,
  registerMessagingToken: async () => null,
  handleForegroundMessage: async () => undefined,
};
