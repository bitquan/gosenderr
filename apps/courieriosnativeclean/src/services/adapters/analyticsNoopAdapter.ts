import type {AuthSession} from '../../types/auth';
import type {AnalyticsServicePort} from '../ports/analyticsPort';

export const analyticsNoopAdapter: AnalyticsServicePort = {
  initialize: async () => undefined,
  identifyUser: async (_session: AuthSession) => undefined,
  clearUser: async () => undefined,
  track: async () => undefined,
  recordError: async () => undefined,
};
