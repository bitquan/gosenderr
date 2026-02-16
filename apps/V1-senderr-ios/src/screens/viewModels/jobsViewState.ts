import type {JobsSyncState, JobsSyncStatus} from '../../services/ports/jobsPort';

export type JobsScreenState =
  | {
      kind: 'loading';
      title: string;
      message: string;
    }
  | {
      kind: 'error';
      title: string;
      message: string;
    }
  | {
      kind: 'empty';
      title: string;
      message: string;
    }
  | {
      kind: 'ready';
    };

export type SyncHealthTone = 'idle' | 'live' | 'degraded' | 'error';

export type SyncHealthViewModel = {
  tone: SyncHealthTone;
  title: string;
  message: string;
};

const SYNC_HEALTH_BY_STATUS: Record<JobsSyncStatus, SyncHealthViewModel> = {
  idle: {
    tone: 'idle',
    title: 'Idle',
    message: 'Waiting for the next sync cycle.',
  },
  connecting: {
    tone: 'degraded',
    title: 'Connecting',
    message: 'Establishing live updates...',
  },
  live: {
    tone: 'live',
    title: 'Live',
    message: 'Live updates are active.',
  },
  reconnecting: {
    tone: 'degraded',
    title: 'Reconnecting',
    message: 'Reconnecting after an interruption.',
  },
  stale: {
    tone: 'degraded',
    title: 'Stale',
    message: 'Showing cached data while reconnecting.',
  },
  error: {
    tone: 'error',
    title: 'Error',
    message: 'Sync failed. Manual retry is available.',
  },
};

export const deriveSyncHealth = (syncState: JobsSyncState): SyncHealthViewModel => {
  const fallback = SYNC_HEALTH_BY_STATUS[syncState.status];

  return {
    ...fallback,
    message: syncState.message ?? fallback.message,
  };
};

export const deriveJobsScreenState = ({
  loading,
  error,
  jobsCount,
}: {
  loading: boolean;
  error: string | null;
  jobsCount: number;
}): JobsScreenState => {
  if (loading && jobsCount === 0) {
    return {
      kind: 'loading',
      title: 'Loading jobs',
      message: 'Checking your latest assignments...',
    };
  }

  if (error && jobsCount === 0) {
    return {
      kind: 'error',
      title: 'Unable to load jobs',
      message: error,
    };
  }

  if (jobsCount === 0) {
    return {
      kind: 'empty',
      title: 'No jobs assigned',
      message: 'New assignments will appear here when dispatch sends them.',
    };
  }

  return {kind: 'ready'};
};

export const formatSyncTime = (isoTime: string | null): string => {
  if (!isoTime) {
    return 'Never';
  }

  return new Date(isoTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};

export const formatLocationSampleTime = (timestamp: number | null): string => {
  if (!timestamp) {
    return 'Never';
  }

  return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};
