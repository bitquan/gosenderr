import type {AnalyticsServicePort} from '../ports/analyticsPort';

export const analyticsNoopAdapter: AnalyticsServicePort = {
  track: async () => undefined,
};
