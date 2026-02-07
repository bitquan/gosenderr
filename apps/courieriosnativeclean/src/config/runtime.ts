export type SenderrEnvironment = 'dev' | 'staging' | 'prod';

type FirebaseRuntimeConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type RuntimeConfig = {
  envName: SenderrEnvironment;
  apiBaseUrl: string;
  firebase: FirebaseRuntimeConfig;
};

export type NativeRuntimeConfig = {
  envName?: string;
  apiBaseUrl?: string;
  firebase?: Partial<FirebaseRuntimeConfig>;
};

const readEnv = (key: string): string => {
  const value = (process.env as Record<string, string | undefined>)[key];
  return value ? value.trim() : '';
};

const normalizeEnvName = (value: string): SenderrEnvironment => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'staging') {
    return 'staging';
  }
  if (normalized === 'prod' || normalized === 'production') {
    return 'prod';
  }
  return 'dev';
};

const ENV_DEFAULTS: Record<SenderrEnvironment, Omit<RuntimeConfig, 'envName'>> = {
  dev: {
    apiBaseUrl: 'https://dev-api.gosenderr.com',
    firebase: {
      apiKey: '',
      authDomain: 'gosenderr-dev.firebaseapp.com',
      projectId: 'gosenderr-dev',
      storageBucket: 'gosenderr-dev.appspot.com',
      messagingSenderId: '',
      appId: '',
    },
  },
  staging: {
    apiBaseUrl: 'https://staging-api.gosenderr.com',
    firebase: {
      apiKey: '',
      authDomain: 'gosenderr-staging.firebaseapp.com',
      projectId: 'gosenderr-staging',
      storageBucket: 'gosenderr-staging.appspot.com',
      messagingSenderId: '',
      appId: '',
    },
  },
  prod: {
    apiBaseUrl: 'https://api.gosenderr.com',
    firebase: {
      apiKey: '',
      authDomain: 'gosenderr-6773f.firebaseapp.com',
      projectId: 'gosenderr-6773f',
      storageBucket: 'gosenderr-6773f.appspot.com',
      messagingSenderId: '',
      appId: '',
    },
  },
};

const resolveString = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const normalizeApiBaseUrl = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `https://${normalized}`;
};

const buildConfigFromSources = (nativeConfig?: NativeRuntimeConfig): RuntimeConfig => {
  const envSource =
    nativeConfig?.envName ||
    readEnv('SENDERR_ENV_NAME') ||
    readEnv('SENDERR_APP_ENV') ||
    readEnv('SENDERR_ENV') ||
    'dev';
  const envName = normalizeEnvName(envSource);
  const defaults = ENV_DEFAULTS[envName];
  const nativeFirebase = nativeConfig?.firebase ?? {};

  return {
    envName,
    apiBaseUrl: normalizeApiBaseUrl(resolveString(nativeConfig?.apiBaseUrl, defaults.apiBaseUrl)),
    firebase: {
      apiKey: resolveString(nativeFirebase.apiKey ?? readEnv('SENDERR_FIREBASE_API_KEY'), defaults.firebase.apiKey),
      authDomain: resolveString(
        nativeFirebase.authDomain ?? readEnv('SENDERR_FIREBASE_AUTH_DOMAIN'),
        defaults.firebase.authDomain,
      ),
      projectId: resolveString(
        nativeFirebase.projectId ?? readEnv('SENDERR_FIREBASE_PROJECT_ID'),
        defaults.firebase.projectId,
      ),
      storageBucket: resolveString(
        nativeFirebase.storageBucket ?? readEnv('SENDERR_FIREBASE_STORAGE_BUCKET'),
        defaults.firebase.storageBucket,
      ),
      messagingSenderId: resolveString(
        nativeFirebase.messagingSenderId ?? readEnv('SENDERR_FIREBASE_MESSAGING_SENDER_ID'),
        defaults.firebase.messagingSenderId,
      ),
      appId: resolveString(nativeFirebase.appId ?? readEnv('SENDERR_FIREBASE_APP_ID'), defaults.firebase.appId),
    },
  };
};

export const runtimeConfig: RuntimeConfig = buildConfigFromSources();

export const configureRuntime = (nativeConfig?: NativeRuntimeConfig): void => {
  const next = buildConfigFromSources(nativeConfig);
  runtimeConfig.envName = next.envName;
  runtimeConfig.apiBaseUrl = next.apiBaseUrl;
  runtimeConfig.firebase = next.firebase;
};

export const hasFirebaseConfig = (): boolean => {
  const cfg = runtimeConfig.firebase;
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
};
