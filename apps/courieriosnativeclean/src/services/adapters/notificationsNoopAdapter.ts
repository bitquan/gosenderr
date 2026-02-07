import type {NotificationsServicePort} from '../ports/notificationsPort';

export const notificationsNoopAdapter: NotificationsServicePort = {
  requestPermission: async () => false,
  registerDeviceToken: async () => null,
  handleForegroundMessage: async () => undefined,
};
