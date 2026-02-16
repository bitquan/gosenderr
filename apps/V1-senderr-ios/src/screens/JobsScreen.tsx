import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';

import {EmptyState} from '../components/states/EmptyState';
import {ErrorState} from '../components/states/ErrorState';
import {LoadingState} from '../components/states/LoadingState';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import type {JobsSyncState} from '../services/ports/jobsPort';
import {deriveJobsScreenState, deriveSyncHealth, formatSyncTime} from './viewModels/jobsViewState';
import type {Job} from '../types/jobs';
import {senderrTheme} from '../theme/senderrTheme';

type JobsScreenProps = {
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  loadingJobs: boolean;
  jobsError: string | null;
  syncState: JobsSyncState;
  onRefresh: () => Promise<Job[]>;
  onOpenDetail: (jobId: string) => void;
};

export const JobsScreen = ({
  jobs,
  setJobs,
  loadingJobs,
  jobsError,
  syncState,
  onRefresh,
  onOpenDetail,
}: JobsScreenProps): React.JSX.Element => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);

    try {
      const nextJobs = await onRefresh();
      setJobs(nextJobs);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Unable to refresh jobs.');
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, setJobs]);

  const combinedError = refreshError ?? jobsError;
  const viewState = deriveJobsScreenState({
    loading: loadingJobs,
    error: combinedError,
    jobsCount: jobs.length,
  });
  const syncHealth = deriveSyncHealth(syncState);

  const syncCardTone = useMemo(() => {
    if (syncHealth.tone === 'live') {
      return styles.syncCardLive;
    }
    if (syncHealth.tone === 'error') {
      return styles.syncCardError;
    }
    if (syncHealth.tone === 'degraded') {
      return styles.syncCardDegraded;
    }
    return styles.syncCardIdle;
  }, [syncHealth.tone]);

  const shouldShowSyncRetry = syncHealth.tone === 'degraded' || syncHealth.tone === 'error';

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>{jobs.length} jobs loaded</Text>
      </View>

      <View style={[styles.syncCard, syncCardTone]}>
        <Text style={styles.syncTitle}>Sync: {syncHealth.title}</Text>
        <Text style={styles.syncText}>{syncHealth.message}</Text>
        <Text style={styles.syncMeta}>
          Last sync: {formatSyncTime(syncState.lastSyncedAt)}
          {syncState.reconnectAttempt > 0 ? ` | Retry ${syncState.reconnectAttempt}` : ''}
        </Text>
        {shouldShowSyncRetry ? (
          <PrimaryButton
            label="Retry sync"
            variant="secondary"
            onPress={() => {
              void refresh();
            }}
          />
        ) : null}
      </View>

      {viewState.kind === 'loading' ? (
        <LoadingState
          title={viewState.title}
          message={viewState.message}
        />
      ) : null}

      {viewState.kind === 'error' ? (
        <ErrorState
          title={viewState.title}
          message={viewState.message}
          retryLabel="Retry jobs"
          onRetry={() => {
            void refresh();
          }}
        />
      ) : null}

      {viewState.kind === 'empty' ? (
        <EmptyState
          title={viewState.title}
          message={viewState.message}
          actionLabel="Refresh"
          onAction={() => {
            void refresh();
          }}
        />
      ) : null}

      {viewState.kind === 'ready' ? (
        <>
          {combinedError ? (
            <ErrorState
              compact
              title="Background sync issue"
              message={combinedError}
              retryLabel="Retry"
              onRetry={() => {
                void refresh();
              }}
            />
          ) : null}

          <FlatList
            data={jobs}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
            contentContainerStyle={styles.listContent}
            renderItem={({item}) => (
              <Pressable style={styles.card} onPress={() => onOpenDetail(item.id)}>
                <View style={styles.row}>
                  <Text style={styles.customer}>{item.customerName}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.address}>{item.pickupAddress}</Text>
                <Text style={styles.addressLabel}>Dropoff</Text>
                <Text style={styles.address}>{item.dropoffAddress}</Text>
                <Text style={styles.meta}>ETA {item.etaMinutes} min</Text>
              </Pressable>
            )}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  subtitle: {
    color: senderrTheme.colors.textSecondary,
    marginTop: 2,
  },
  syncCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  syncCardLive: {
    backgroundColor: '#ECFDF5',
  },
  syncCardDegraded: {
    backgroundColor: '#FFF7ED',
  },
  syncCardError: {
    backgroundColor: '#FEF2F2',
  },
  syncCardIdle: {
    backgroundColor: senderrTheme.colors.brandSoft,
  },
  syncTitle: {
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  syncText: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 13,
  },
  syncMeta: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 12,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  customer: {
    fontSize: 16,
    fontWeight: '700',
    color: senderrTheme.colors.textPrimary,
  },
  addressLabel: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  address: {
    color: senderrTheme.colors.textPrimary,
    fontSize: 14,
  },
  meta: {
    marginTop: 6,
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
  },
});
