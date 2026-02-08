import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import {NEXT_STATUS, type Job, type JobStatus} from '../types/jobs';

type JobDetailScreenProps = {
  job: Job;
  onBack: () => void;
  onJobUpdated: (job: Job) => void;
};

type Feedback = {
  message: string;
  tone: 'error' | 'info';
};

export const JobDetailScreen = ({job, onBack, onJobUpdated}: JobDetailScreenProps): React.JSX.Element => {
  const {session} = useAuth();
  const {jobs: jobsService} = useServiceRegistry();
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const nextStatus = useMemo<JobStatus | null>(() => NEXT_STATUS[job.status] ?? null, [job.status]);

  const handleUpdate = async (): Promise<void> => {
    if (!session || !nextStatus) {
      return;
    }

    setUpdating(true);
    setFeedback(null);

    try {
      const result = await jobsService.updateJobStatus(session, job.id, nextStatus);

      if (result.kind === 'success') {
        onJobUpdated(result.job);
        if (result.message) {
          setFeedback({message: result.message, tone: 'info'});
        }
        return;
      }

      if (result.kind === 'conflict' || result.kind === 'retryable_error') {
        onJobUpdated(result.job);
        setFeedback({message: result.message, tone: 'error'});
        return;
      }

      if (result.job) {
        onJobUpdated(result.job);
      }
      setFeedback({message: result.message, tone: 'error'});
    } catch (updateError) {
      setFeedback({
        message: updateError instanceof Error ? updateError.message : 'Unable to update status.',
        tone: 'error',
      });
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

        {feedback ? <Text style={feedback.tone === 'error' ? styles.error : styles.info}>{feedback.message}</Text> : null}

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
  info: {
    color: '#1d4ed8',
    fontWeight: '600',
    marginTop: 4,
  },
});
