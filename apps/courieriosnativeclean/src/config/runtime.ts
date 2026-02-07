const readEnv = (key: string): string => {
  const value = (process.env as Record<string, string | undefined>)[key];
  return value ? value.trim() : '';
};

export const runtimeConfig = {
  firebase: {
    apiKey: readEnv('SENDERR_FIREBASE_API_KEY'),
    authDomain: readEnv('SENDERR_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('SENDERR_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('SENDERR_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('SENDERR_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('SENDERR_FIREBASE_APP_ID'),
  },
};

export const hasFirebaseConfig = (): boolean => {
  const cfg = runtimeConfig.firebase;
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
};
