export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export interface NotificationsServicePort {
  requestPermission: () => Promise<boolean>;
  registerDeviceToken: () => Promise<string | null>;
  registerMessagingToken: () => Promise<string | null>;
  handleForegroundMessage: (payload: NotificationPayload) => Promise<void>;
  subscribeToForegroundMessages: (
    onMessage: (payload: NotificationPayload) => void,
  ) => () => void;
}
