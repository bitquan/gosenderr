import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import {
  classifyCommandResultError,
  classifyUnknownError,
  formatErrorContext,
} from '../services/errorSystem';
import {NEXT_STATUS, type Job} from '../types/jobs';
import type {JobStatus} from '@gosenderr/contracts';
import {launchCamera} from 'react-native-image-picker';
import {senderrTheme} from '../theme/senderrTheme';

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
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Proof upload UI state
  const [uploadingProof, setUploadingProof] = useState(false);
  const [lastProofPayload, setLastProofPayload] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const nextStatus = useMemo<JobStatus | null>(() => NEXT_STATUS[job.status] ?? null, [job.status]);

  const {location: locationService} = useServiceRegistry();
  const {state: locationState} = locationService.useLocationTracking();

  const runLifecycleCommand = (
    uidSession: NonNullable<typeof session>,
    jobId: string,
    status: JobStatus,
  ) => {
    switch (status) {
      case 'assigned':
        return jobsService.commandAcceptJob
          ? jobsService.commandAcceptJob(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      case 'enroute_pickup':
        return jobsService.commandStartPickup
          ? jobsService.commandStartPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      case 'arrived_pickup':
        return jobsService.commandMarkArrivedPickup
          ? jobsService.commandMarkArrivedPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      case 'picked_up':
        return jobsService.commandConfirmPickup
          ? jobsService.commandConfirmPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      case 'enroute_dropoff':
        return jobsService.commandStartDropoff
          ? jobsService.commandStartDropoff(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      case 'completed':
        return jobsService.commandCompleteDelivery
          ? jobsService.commandCompleteDelivery(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, status);
      default:
        return jobsService.updateJobStatus(uidSession, jobId, status);
    }
  };

  const handleAttachProof = async (type: 'pickup' | 'dropoff'): Promise<void> => {
    if (!session) return;
    setUpdating(true);
    setFeedback(null);

    try {
      const response = await launchCamera({mediaType: 'photo', includeBase64: true, quality: 0.7});
      const asset = response.assets && response.assets[0];
      if (!asset || (!asset.base64 && !asset.uri)) {
        setFeedback({message: 'No photo captured.', tone: 'error'});
        return;
      }

      const base64 = asset.base64 ?? null;
      const mime = asset.type ?? 'image/jpeg';
      const url = base64 ? `data:${mime};base64,${base64}` : asset.uri ?? '';

      const location = locationState.lastLocation
        ? {latitude: locationState.lastLocation.latitude, longitude: locationState.lastLocation.longitude}
        : undefined;
      const accuracy = locationState.lastLocation?.accuracy ?? undefined;
      const timestamp = new Date().toISOString();

      const payload = {url, location, accuracy, timestamp};
      setLastProofPayload(payload);
      setUploadingProof(true);
      setUploadError(null);

      try {
        const updated = await jobsService.attachProof(session, job.id, type, payload);
        onJobUpdated(updated);
        setFeedback({message: 'Proof attached.', tone: 'info'});
        setLastProofPayload(null);
      } catch (err) {
        const classified = classifyUnknownError(err, {
          source: 'job_detail_attach_proof',
          fallbackMessage: 'Unable to attach proof.',
        });
        void analytics.recordError(err, formatErrorContext('job_detail_attach_proof', classified));
        setFeedback({message: classified.userMessage, tone: 'error'});
        setUploadError(classified.userMessage);
      } finally {
        setUploadingProof(false);
        setUpdating(false);
      }
    } catch (err) {
      const classified = classifyUnknownError(err, {
        source: 'job_detail_capture_proof',
        fallbackMessage: 'Unable to attach proof.',
      });
      void analytics.recordError(err, formatErrorContext('job_detail_capture_proof', classified));
      setFeedback({message: classified.userMessage, tone: 'error'});
      setUpdating(false);
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!session || !nextStatus || !statusActionsEnabled || updating) {
      return;
    }

    setUpdating(true);
    setFeedback(null);

    try {
      const result = await runLifecycleCommand(session, job.id, nextStatus);

      if (result.kind === 'success') {
        onJobUpdated(result.job);
        void analytics.track('job_status_updated', {
          from_status: job.status,
          to_status: result.job.status,
          idempotent: result.idempotent,
        });
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
        const classified = classifyCommandResultError(result, {
          source: 'job_detail_status_update',
        });
        setFeedback({message: classified.userMessage, tone: classified.retryable ? 'info' : 'error'});
        return;
      }

      if (result.job) {
        onJobUpdated(result.job);
      }
      const classified = classifyCommandResultError(result, {
        source: 'job_detail_status_update',
      });
      void analytics.recordError(new Error(result.message), formatErrorContext('job_detail_status_update', classified));
      setFeedback({message: classified.userMessage, tone: 'error'});
    } catch (updateError) {
      const classified = classifyUnknownError(updateError, {
        source: 'job_detail_status_update',
        fallbackMessage: 'Unable to update status.',
      });
      void analytics.recordError(updateError, formatErrorContext('job_detail_status_update', classified));
      setFeedback({
        message: classified.userMessage,
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

        {job.photos && job.photos.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Order Confirmation Photos</Text>
            <View style={styles.photoGrid}>
              {job.photos.slice(0, 4).map((photo, index) => (
                <Image
                  key={`${photo.url}-${index}`}
                  source={{uri: photo.url}}
                  style={styles.photoPreview}
                />
              ))}
            </View>
            <Text style={styles.photoHint}>Customer-submitted confirmation photos for pickup.</Text>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>ETA</Text>
        <Text style={styles.sectionValue}>{job.etaMinutes} minutes</Text>

        {!statusActionsEnabled ? <Text style={styles.info}>Status updates are currently disabled by rollout controls.</Text> : null}
        {feedback ? <Text style={feedback.tone === 'error' ? styles.error : styles.info}>{feedback.message}</Text> : null}

        <PrimaryButton
          label={
            nextStatus
              ? `Mark as ${nextStatus.replace('_', ' ')}`
              : 'No further actions'
          }
          disabled={!nextStatus || !statusActionsEnabled}
          onPress={() => {
            void handleUpdate();
          }}
        />

        {/* If the next transition requires proof and proof is missing, allow quick capture here */}
        {nextStatus === 'picked_up' && !job.pickupProof ? (
          <PrimaryButton label="Attach pickup proof" variant="secondary" onPress={() => void handleAttachProof('pickup')} />
        ) : null}
        {nextStatus === 'completed' && !job.dropoffProof ? (
          <PrimaryButton label="Attach dropoff proof" variant="secondary" onPress={() => void handleAttachProof('dropoff')} />
        ) : null}

        {/* Upload status / retry UI for proof */}
        {uploadingProof ? <Text style={styles.info}>Uploading proof…</Text> : null}
        {uploadError && lastProofPayload ? (
          <View style={{marginTop: 8}}>
            <Text style={styles.error}>{uploadError}</Text>
            <PrimaryButton
              label="Retry Upload"
              variant="secondary"
              onPress={async () => {
                if (!session || !lastProofPayload) return;
                setUploadingProof(true);
                setUploadError(null);
                try {
                  const updated = await jobsService.attachProof(session, job.id, nextStatus === 'picked_up' ? 'pickup' : 'dropoff', lastProofPayload);
                  onJobUpdated(updated);
                  setFeedback({message: 'Proof attached.', tone: 'info'});
                  setLastProofPayload(null);
                } catch (err) {
                  const classified = classifyUnknownError(err, {
                    source: 'job_detail_retry_proof_upload',
                    fallbackMessage: 'Retry failed.',
                  });
                  void analytics.recordError(err, formatErrorContext('job_detail_retry_proof_upload', classified));
                  setUploadError(classified.userMessage);
                  setFeedback({message: classified.userMessage, tone: 'error'});
                } finally {
                  setUploadingProof(false);
                }
              }}
            />
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
    marginBottom: 2,
  },
  sectionLabel: {
    marginTop: 8,
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionValue: {
    color: senderrTheme.colors.textPrimary,
    fontSize: 15,
  },
  error: {
    color: senderrTheme.colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  info: {
    color: senderrTheme.colors.info,
    fontWeight: '600',
    marginTop: 4,
  },
  photoGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: senderrTheme.colors.surfaceMuted,
  },
  photoHint: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
});
