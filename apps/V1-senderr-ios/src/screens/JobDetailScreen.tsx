import React, {useMemo, useState, useRef} from 'react';
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
  const {jobs: jobsService, featureFlags, analytics} = useServiceRegistry();
  const {state: featureFlagState} = featureFlags.useFeatureFlags();
  const statusActionsEnabled = featureFlagState.flags.jobStatusActions;
  const [updating, setUpdating] = useState(false);
  const updatingRef = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const nextStatus = useMemo<JobStatus | null>(() => NEXT_STATUS[job.status] ?? null, [job.status]);

  const handleUpdate = async (): Promise<void> => {
    if (!session || !nextStatus || !statusActionsEnabled || updatingRef.current) {
      return;
    }

    setUpdating(true);
    updatingRef.current = true;
    setFeedback(null);

    try {
      const result = await jobsService.updateJobStatus(session, job.id, nextStatus);

      if (result.kind === 'success') {
        onJobUpdated(result.job);
        void analytics.track('job_status_updated', {
          from_status: job.status,
          to_status: result.job.status,
          idempotent: result.idempotent,
        });
        // If the courier accepted the job, close the detail view and return to map-shell.
        if (result.job.status === 'accepted') {
          onBack();
        }
        if (result.message) {
          setFeedback({message: result.message, tone: 'info'});
        }
        return;
      }

      if (result.kind === 'conflict' || result.kind === 'retryable_error') {
        onJobUpdated(result.job);
        void analytics.track('job_status_updated', {
          from_status: job.status,
          to_status: result.job.status,
          result_kind: result.kind,
        });

        // Conflicts are user-facing errors; retryable (queued) updates are informative.
        if (result.kind === 'conflict') {
          setFeedback({message: result.message, tone: 'error'});
        } else {
          setFeedback({message: result.message, tone: 'info'});
        }
        return;
      }

      if (result.job) {
        onJobUpdated(result.job);
      }
      void analytics.recordError(new Error(result.message), `job_status_update_${result.kind}`);
      setFeedback({message: result.message, tone: 'error'});
    } catch (updateError) {
      void analytics.recordError(updateError, 'job_status_update_failed');
      setFeedback({
        message: updateError instanceof Error ? updateError.message : 'Unable to update status.',
        tone: 'error',
      });
    } finally {
      setUpdating(false);
      updatingRef.current = false;
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

        {!statusActionsEnabled ? <Text style={styles.info}>Status updates are currently disabled by rollout controls.</Text> : null}
        {feedback ? <Text style={feedback.tone === 'error' ? styles.error : styles.info}>{feedback.message}</Text> : null}

        <PrimaryButton
          label={
            nextStatus
              ? updating
                ? 'Updating...'
                : `Mark as ${nextStatus.replace('_', ' ')}`
              : 'No further actions'
          }
          disabled={updating || !nextStatus || !statusActionsEnabled}
          onPress={() => {
            void handleUpdate();
          }}
        />

        {/* Allow courier to close / skip a pending or accepted job */}
        {(job.status === 'pending' || job.status === 'accepted') && statusActionsEnabled ? (
          <PrimaryButton
            label={updating ? 'Closing...' : 'Close Job'}
            variant="secondary"
            disabled={updating}
            onPress={async () => {
              if (!session) return;
              setUpdating(true);
              setFeedback(null);
              try {
                const res = await jobsService.updateJobStatus(session, job.id, 'cancelled');
                if (res.kind === 'success' && res.job) {
                  onJobUpdated(res.job);
                  void analytics.track('job_status_updated', {from_status: job.status, to_status: res.job.status});
                } else if (res.job) {
                  onJobUpdated(res.job);
                  setFeedback({message: res.message, tone: 'error'});
                } else {
                  setFeedback({message: res.message, tone: 'error'});
                }
              } catch (err) {
                void analytics.recordError(err as Error, 'job_close_failed');
                setFeedback({message: (err as Error).message ?? 'Failed to close job', tone: 'error'});
              } finally {
                setUpdating(false);
              }
            }}
          />
        ) : null}
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
