const LIVE_HOSTS = new Set([
  'gosenderr.com',
  'www.gosenderr.com',
]);

function getHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function isLivePaymentEnvironment(): boolean {
  const deployEnv = String(import.meta.env.VITE_DEPLOY_ENV || '').toLowerCase();
  if (deployEnv === 'production' || deployEnv === 'prod') {
    return true;
  }

  const hostname = getHostname();
  return LIVE_HOSTS.has(hostname);
}

export function canUsePaymentMocks(): boolean {
  if (isLivePaymentEnvironment()) {
    return false;
  }

  const explicitlyEnabled = String(import.meta.env.VITE_ENABLE_PAYMENT_MOCKS || '').toLowerCase() === 'true';
  if (explicitlyEnabled) {
    return true;
  }

  const hostname = getHostname();
  const hasEmulatorConfig = Boolean(
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
      import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ||
      import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST
  );

  return Boolean(import.meta.env.DEV && (isLocalHost(hostname) || hasEmulatorConfig));
}

