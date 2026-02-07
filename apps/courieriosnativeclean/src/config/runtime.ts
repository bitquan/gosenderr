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
  allowMockAuth: boolean;
  firebase: FirebaseRuntimeConfig;
};

export type NativeRuntimeConfig = {
  envName?: string;
  apiBaseUrl?: string;
  allowMockAuth?: boolean;
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
    allowMockAuth: false,
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
    allowMockAuth: false,
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
    allowMockAuth: false,
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

const resolveBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
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
    'dev';
  const envName = normalizeEnvName(envSource);
  const defaults = ENV_DEFAULTS[envName];
  const nativeFirebase = nativeConfig?.firebase ?? {};
  const allowMockAuth =
    nativeConfig?.allowMockAuth ??
    resolveBoolean(readEnv('SENDERR_ALLOW_MOCK_AUTH'), false);

  return {
    envName,
    apiBaseUrl: normalizeApiBaseUrl(resolveString(nativeConfig?.apiBaseUrl, defaults.apiBaseUrl)),
    allowMockAuth: envName === 'prod' ? false : allowMockAuth,
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
  runtimeConfig.allowMockAuth = next.allowMockAuth;
  runtimeConfig.firebase = next.firebase;
};

export const hasFirebaseConfig = (): boolean => {
  const cfg = runtimeConfig.firebase;
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
};

export const isMockAuthEnabled = (): boolean => runtimeConfig.allowMockAuth;
