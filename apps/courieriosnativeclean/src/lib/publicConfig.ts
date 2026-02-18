import { firebaseConfig } from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface PublicConfig {
  stripePublishableKey?: string;
  stripeMode?: 'test' | 'live';
  mapboxPublicToken?: string;
}

let cachedConfig: PublicConfig | null = null;
let inFlight: Promise<PublicConfig> | null = null;
let lastFailureAt: number | null = null;
const FAILURE_BACKOFF_MS = 60 * 1000;

function resolvePublicConfigUrl(): string {
  const projectId = firebaseConfig.projectId || '';
  if (!projectId) return '';
  return `https://us-central1-${projectId}.cloudfunctions.net/getPublicConfigHttp`;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig;

  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
    return {};
  }

  if (!inFlight) {
    const url = resolvePublicConfigUrl();
    if (!url) return {};

    inFlight = fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Public config request failed: ${res.status}`);
        }
        const data = (await res.json()) as PublicConfig;
        cachedConfig = data || {};
        return cachedConfig;
      })
      .catch((error) => {
        console.error('Failed to load public config', error);
        lastFailureAt = Date.now();
        return {};
      });
  }

  const result = await inFlight;
  if (Object.keys(result || {}).length) {
    return result;
  }

  try {
    const functions = getFunctions();
    const getPublicConfigFn = httpsCallable<void, PublicConfig>(functions, 'getPublicConfig');
    const response = await getPublicConfigFn();
    cachedConfig = response.data || {};
    return cachedConfig;
  } catch (callableError) {
    console.error('Failed to load public config via callable', callableError);
    lastFailureAt = Date.now();
    return {};
  }
}
