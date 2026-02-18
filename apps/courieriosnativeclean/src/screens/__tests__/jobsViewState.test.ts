import {deriveJobsScreenState, deriveSyncHealth, formatLocationSampleTime, formatSyncTime} from '../viewModels/jobsViewState';
import type {JobsSyncState} from '../../services/ports/jobsPort';

const makeSyncState = (overrides: Partial<JobsSyncState> = {}): JobsSyncState => ({
  status: 'idle',
  stale: false,
  reconnectAttempt: 0,
  lastSyncedAt: null,
  message: null,
  source: 'firebase',
  ...overrides,
});

describe('jobsViewState', () => {
  it('returns loading state when loading without jobs', () => {
    const result = deriveJobsScreenState({
      loading: true,
      error: null,
      jobsCount: 0,
    });

    expect(result.kind).toBe('loading');
  });

  it('returns error state when error and no jobs', () => {
    const result = deriveJobsScreenState({
      loading: false,
      error: 'Network unavailable',
      jobsCount: 0,
    });

    expect(result).toEqual({
      kind: 'error',
      title: 'Unable to load jobs',
      message: 'Network unavailable',
    });
  });

  it('returns empty state when no jobs and no error', () => {
    const result = deriveJobsScreenState({
      loading: false,
      error: null,
      jobsCount: 0,
    });

    expect(result.kind).toBe('empty');
  });

  it('returns ready state when jobs are available', () => {
    const result = deriveJobsScreenState({
      loading: false,
      error: 'Background sync failed',
      jobsCount: 2,
    });

    expect(result).toEqual({kind: 'ready'});
  });

  it('maps sync status to sync health', () => {
    const live = deriveSyncHealth(makeSyncState({status: 'live'}));
    const stale = deriveSyncHealth(makeSyncState({status: 'stale'}));
    const error = deriveSyncHealth(makeSyncState({status: 'error'}));

    expect(live.tone).toBe('live');
    expect(stale.tone).toBe('degraded');
    expect(error.tone).toBe('error');
  });

  it('prefers explicit sync message when present', () => {
    const result = deriveSyncHealth(
      makeSyncState({
        status: 'reconnecting',
        message: 'Retrying connection after timeout',
      }),
    );

    expect(result.message).toBe('Retrying connection after timeout');
  });

  it('formats sync and location timestamps', () => {
    expect(formatSyncTime(null)).toBe('Never');
    expect(formatLocationSampleTime(null)).toBe('Never');
    expect(formatSyncTime('2026-02-08T18:00:00.000Z')).toContain(':');
    expect(formatLocationSampleTime(1739047200000)).toContain(':');
  });
});
