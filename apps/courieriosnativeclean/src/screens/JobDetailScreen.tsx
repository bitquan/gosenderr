import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {updateJobStatus} from '../services/jobsService';
import {NEXT_STATUS, type Job, type JobStatus} from '../types/jobs';

type JobDetailScreenProps = {
  job: Job;
  onBack: () => void;
  onJobUpdated: (job: Job) => void;
};

export const JobDetailScreen = ({job, onBack, onJobUpdated}: JobDetailScreenProps): React.JSX.Element => {
  const {session} = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = useMemo<JobStatus | null>(() => NEXT_STATUS[job.status] ?? null, [job.status]);

  const handleUpdate = async (): Promise<void> => {
    if (!session || !nextStatus) {
      return;
    }

    const optimistic: Job = {
      ...job,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    setUpdating(true);
    setError(null);
    onJobUpdated(optimistic);

    try {
      const updated = await updateJobStatus(session, job.id, nextStatus);
      onJobUpdated(updated);
    } catch (updateError) {
      onJobUpdated(job);
      setError(updateError instanceof Error ? updateError.message : 'Unable to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScreenContainer>
      <PrimaryButton label="Back to Jobs" variant="secondary" onPress={onBack} />

      <View style={styles.card}>
        <Text style={styles.title}>{job.customerName}</Text>
        <StatusBadge status={job.status} />

        <Text style={styles.sectionLabel}>Pickup</Text>
        <Text style={styles.sectionValue}>{job.pickupAddress}</Text>

        <Text style={styles.sectionLabel}>Dropoff</Text>
        <Text style={styles.sectionValue}>{job.dropoffAddress}</Text>

        <Text style={styles.sectionLabel}>Notes</Text>
        <Text style={styles.sectionValue}>{job.notes ?? 'No notes from customer.'}</Text>

        <Text style={styles.sectionLabel}>ETA</Text>
        <Text style={styles.sectionValue}>{job.etaMinutes} minutes</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={
            nextStatus
              ? updating
                ? 'Updating...'
                : `Mark as ${nextStatus.replace('_', ' ')}`
              : 'No further actions'
          }
          disabled={updating || !nextStatus}
          onPress={() => {
            void handleUpdate();
          }}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  sectionLabel: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: '#1f2937',
    fontSize: 15,
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
  },
});
