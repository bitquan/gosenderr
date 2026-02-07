import React, {useCallback, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';

import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {fetchJobs} from '../services/jobsService';
import type {Job} from '../types/jobs';

type JobsScreenProps = {
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  onOpenDetail: (jobId: string) => void;
};

export const JobsScreen = ({jobs, setJobs, onOpenDetail}: JobsScreenProps): React.JSX.Element => {
  const {session} = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const nextJobs = await fetchJobs(session);
      setJobs(nextJobs);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh jobs.');
    } finally {
      setRefreshing(false);
    }
  }, [session, setJobs]);

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>{jobs.length} jobs loaded</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No jobs assigned yet.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    marginTop: 2,
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 4,
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
    color: '#111827',
  },
  addressLabel: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  address: {
    color: '#1f2937',
    fontSize: 14,
  },
  meta: {
    marginTop: 6,
    color: '#1453ff',
    fontWeight: '700',
  },
  empty: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
  },
});
