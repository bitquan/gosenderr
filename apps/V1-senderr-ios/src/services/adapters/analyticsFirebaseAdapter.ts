import {runtimeConfig} from '../../config/runtime';
import type {AuthSession} from '../../types/auth';
import type {AnalyticsEventName, AnalyticsServicePort} from '../ports/analyticsPort';

type AnalyticsInstance = unknown;
type CrashlyticsInstance = unknown;

type AnalyticsModule = {
  getAnalytics?: () => AnalyticsInstance;
  logEvent?: (
    analytics: AnalyticsInstance,
    name: string,
    params?: Record<string, string | number>,
  ) => Promise<void>;
  setAnalyticsCollectionEnabled?: (analytics: AnalyticsInstance, enabled: boolean) => Promise<void>;
  setUserId?: (analytics: AnalyticsInstance, id: string | null) => Promise<void>;
  setUserProperties?: (analytics: AnalyticsInstance, properties: Record<string, string>) => Promise<void>;
};

type CrashlyticsModule = {
  getCrashlytics?: () => CrashlyticsInstance;
  setCrashlyticsCollectionEnabled?: (crashlytics: CrashlyticsInstance, enabled: boolean) => Promise<null | void>;
  setAttribute?: (crashlytics: CrashlyticsInstance, name: string, value: string) => Promise<null | void>;
  setUserId?: (crashlytics: CrashlyticsInstance, id: string) => Promise<null | void>;
  log?: (crashlytics: CrashlyticsInstance, message: string) => void;
  recordError?: (crashlytics: CrashlyticsInstance, error: Error, jsErrorName?: string) => void;
};

type ErrorUtilsShape = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let initialized = false;
let missingDependencyWarningShown = false;

const getAnalyticsModule = (): AnalyticsModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/analytics') as AnalyticsModule;
  } catch {
    return null;
  }
};

const getCrashlyticsModule = (): CrashlyticsModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/crashlytics') as CrashlyticsModule;
  } catch {
    return null;
  }
};

const getAnalyticsInstance = (): AnalyticsInstance | null => {
  const analyticsModule = getAnalyticsModule();
  if (!analyticsModule?.getAnalytics) {
    return null;
  }
  return analyticsModule.getAnalytics();
};

const getCrashlyticsInstance = (): CrashlyticsInstance | null => {
  const crashlyticsModule = getCrashlyticsModule();
  if (!crashlyticsModule?.getCrashlytics) {
    return null;
  }
  return crashlyticsModule.getCrashlytics();
};

const normalizeParamKey = (key: string): string => {
  const sanitized = key.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);
  return sanitized.length > 0 ? sanitized : 'param';
};

const normalizeParamValue = (value: string | number | boolean | null): string | number | null => {
  if (typeof value === 'string') {
    return value.slice(0, 100);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
};

const normalizeEventPayload = (
  payload?: Record<string, string | number | boolean | null>,
): Record<string, string | number> | undefined => {
  if (!payload) {
    return undefined;
  }

  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(payload)) {
    const normalizedValue = normalizeParamValue(value);
    if (normalizedValue === null) {
      continue;
    }
    normalized[normalizeParamKey(key)] = normalizedValue;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === 'string' ? error : JSON.stringify(error));
};

const getErrorUtils = (): ErrorUtilsShape | null => {
  const maybeGlobal = global as unknown as {ErrorUtils?: ErrorUtilsShape};
  return maybeGlobal.ErrorUtils ?? null;
};

const warnMissingDeps = (): void => {
  if (missingDependencyWarningShown) {
    return;
  }
  missingDependencyWarningShown = true;
  console.warn(
    '[analytics] @react-native-firebase/analytics or @react-native-firebase/crashlytics is unavailable; running without native telemetry.',
  );
};

const installGlobalErrorHandler = (crashlytics: CrashlyticsInstance | null): void => {
  const crashlyticsModule = getCrashlyticsModule();
  const errorUtils = getErrorUtils();
  if (
    !errorUtils?.setGlobalHandler ||
    !errorUtils.getGlobalHandler ||
    !crashlytics ||
    !crashlyticsModule?.log ||
    !crashlyticsModule.recordError
  ) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      crashlyticsModule.log?.(crashlytics, `js_exception fatal=${isFatal ? '1' : '0'}`);
      crashlyticsModule.recordError?.(crashlytics, toError(error));
    } catch {
      // no-op
    }

    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
};

const ensureInitialized = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  const analyticsModule = getAnalyticsModule();
  const crashlyticsModule = getCrashlyticsModule();
  const analytics = getAnalyticsInstance();
  const crashlytics = getCrashlyticsInstance();
  if (
    !analytics ||
    !crashlytics ||
    !analyticsModule?.setAnalyticsCollectionEnabled ||
    !crashlyticsModule?.setCrashlyticsCollectionEnabled ||
    !crashlyticsModule.setAttribute
  ) {
    warnMissingDeps();
    initialized = true;
    return;
  }

  await analyticsModule.setAnalyticsCollectionEnabled(analytics, true);
  await crashlyticsModule.setCrashlyticsCollectionEnabled(crashlytics, true);
  await crashlyticsModule.setAttribute(crashlytics, 'senderr_env', runtimeConfig.envName);
  await crashlyticsModule.setAttribute(crashlytics, 'map_provider', runtimeConfig.maps.provider);
  installGlobalErrorHandler(crashlytics);
  initialized = true;
};

export const analyticsFirebaseAdapter: AnalyticsServicePort = {
  initialize: async () => {
    try {
      await ensureInitialized();
    } catch (error) {
      console.warn('[analytics] initialize failed', error);
    }
  },
  identifyUser: async (session: AuthSession) => {
    try {
      await ensureInitialized();
      const analyticsModule = getAnalyticsModule();
      const crashlyticsModule = getCrashlyticsModule();
      const analytics = getAnalyticsInstance();
      const crashlytics = getCrashlyticsInstance();
      if (
        !analytics ||
        !crashlytics ||
        !analyticsModule?.setUserId ||
        !analyticsModule.setUserProperties ||
        !crashlyticsModule?.setUserId
      ) {
        return;
      }

      await analyticsModule.setUserId(analytics, session.uid);
      await analyticsModule.setUserProperties(analytics, {
        auth_provider: session.provider,
      });
      await crashlyticsModule.setUserId(crashlytics, session.uid);
    } catch (error) {
      console.warn('[analytics] identifyUser failed', error);
    }
  },
  clearUser: async () => {
    try {
      await ensureInitialized();
      const analyticsModule = getAnalyticsModule();
      const analytics = getAnalyticsInstance();
      if (analytics && analyticsModule?.setUserId) {
        await analyticsModule.setUserId(analytics, null);
      }
    } catch (error) {
      console.warn('[analytics] clearUser failed', error);
    }
  },
  track: async (event: AnalyticsEventName, payload) => {
    try {
      await ensureInitialized();
      const analyticsModule = getAnalyticsModule();
      const crashlyticsModule = getCrashlyticsModule();
      const analytics = getAnalyticsInstance();
      const crashlytics = getCrashlyticsInstance();
      if (!analytics || !crashlytics || !analyticsModule?.logEvent || !crashlyticsModule?.log) {
        return;
      }

      const normalizedPayload = normalizeEventPayload(payload);
      await analyticsModule.logEvent(analytics, event, normalizedPayload);
      crashlyticsModule.log(crashlytics, `[event] ${event}`);
    } catch (error) {
      console.warn(`[analytics] track failed for ${event}`, error);
    }
  },
  recordError: async (error: unknown, context?: string) => {
    try {
      await ensureInitialized();
      const crashlyticsModule = getCrashlyticsModule();
      const crashlytics = getCrashlyticsInstance();
      if (!crashlytics || !crashlyticsModule?.recordError) {
        return;
      }
      if (context) {
        crashlyticsModule.log?.(crashlytics, `[error] ${context}`);
      }
      crashlyticsModule.recordError(crashlytics, toError(error));
    } catch (recordErrorFailure) {
      console.warn('[analytics] recordError failed', recordErrorFailure);
    }
  },
};
