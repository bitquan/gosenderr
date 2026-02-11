import {runtimeConfig} from '../../config/runtime';
import type {AuthSession} from '../../types/auth';
import type {
  AnalyticsEventName,
  AnalyticsServicePort,
} from '../ports/analyticsPort';

type AnalyticsInstance = {
  logEvent: (
    name: string,
    params?: Record<string, string | number>,
  ) => Promise<void>;
  setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  setUserId: (id: string | null) => Promise<void>;
  setUserProperties: (properties: Record<string, string>) => Promise<void>;
};

type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  setAttribute: (name: string, value: string) => void;
  setUserId: (id: string) => void;
  log: (message: string) => void;
  recordError: (error: Error, stack?: string) => void;
};

type ErrorUtilsShape = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (
    handler: (error: Error, isFatal?: boolean) => void,
  ) => void;
};

let initialized = false;
let missingDependencyWarningShown = false;

const getAnalyticsInstance = (): AnalyticsInstance | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyticsFactory = require('@react-native-firebase/analytics')
      .default as (() => AnalyticsInstance) | undefined;
    return analyticsFactory ? analyticsFactory() : null;
  } catch {
    return null;
  }
};

const getCrashlyticsInstance = (): CrashlyticsInstance | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crashlyticsFactory = require('@react-native-firebase/crashlytics')
      .default as (() => CrashlyticsInstance) | undefined;
    return crashlyticsFactory ? crashlyticsFactory() : null;
  } catch {
    return null;
  }
};

const normalizeParamKey = (key: string): string => {
  const sanitized = key.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);
  return sanitized.length > 0 ? sanitized : 'param';
};

const normalizeParamValue = (
  value: string | number | boolean | null,
): string | number | null => {
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

const installGlobalErrorHandler = (
  crashlytics: CrashlyticsInstance | null,
): void => {
  const errorUtils = getErrorUtils();
  if (
    !errorUtils?.setGlobalHandler ||
    !errorUtils.getGlobalHandler ||
    !crashlytics
  ) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      crashlytics.log(`js_exception fatal=${isFatal ? '1' : '0'}`);
      crashlytics.recordError(toError(error));
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

  const analytics = getAnalyticsInstance();
  const crashlytics = getCrashlyticsInstance();
  if (!analytics || !crashlytics) {
    warnMissingDeps();
    initialized = true;
    return;
  }

  await analytics.setAnalyticsCollectionEnabled(true);
  await crashlytics.setCrashlyticsCollectionEnabled(true);
  crashlytics.setAttribute('senderr_env', runtimeConfig.envName);
  crashlytics.setAttribute('map_provider', runtimeConfig.maps.provider);
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
      const analytics = getAnalyticsInstance();
      const crashlytics = getCrashlyticsInstance();
      if (!analytics || !crashlytics) {
        return;
      }

      await analytics.setUserId(session.uid);
      await analytics.setUserProperties({
        auth_provider: session.provider,
      });
      crashlytics.setUserId(session.uid);
    } catch (error) {
      console.warn('[analytics] identifyUser failed', error);
    }
  },
  clearUser: async () => {
    try {
      await ensureInitialized();
      const analytics = getAnalyticsInstance();
      if (analytics) {
        await analytics.setUserId(null);
      }
    } catch (error) {
      console.warn('[analytics] clearUser failed', error);
    }
  },
  track: async (event: AnalyticsEventName, payload) => {
    try {
      await ensureInitialized();
      const analytics = getAnalyticsInstance();
      const crashlytics = getCrashlyticsInstance();
      if (!analytics || !crashlytics) {
        return;
      }

      const normalizedPayload = normalizeEventPayload(payload);
      await analytics.logEvent(event, normalizedPayload);
      crashlytics.log(`[event] ${event}`);
    } catch (error) {
      console.warn(`[analytics] track failed for ${event}`, error);
    }
  },
  recordError: async (error: unknown, context?: string) => {
    try {
      await ensureInitialized();
      const crashlytics = getCrashlyticsInstance();
      if (!crashlytics) {
        return;
      }
      if (context) {
        crashlytics.log(`[error] ${context}`);
      }
      crashlytics.recordError(toError(error));
    } catch (recordErrorFailure) {
      console.warn('[analytics] recordError failed', recordErrorFailure);
    }
  },
};
