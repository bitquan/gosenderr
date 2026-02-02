import MapboxGL from '@rnmapbox/maps';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { mapboxConfig } from '../config/mapbox';
import { mockJobs } from '../data/mockJobs';
import { useOpenJobs } from '../hooks/useOpenJobs';
import { useAuth } from '../hooks/useAuth';
import type { Job } from '../types/job';
import type { MockJob } from '../data/mockJobs';
import { claimJob, updateJobStatus } from '../lib/jobs';

MapboxGL.setAccessToken(mapboxConfig.accessToken);

interface MapShellProps {
  onSignOut: () => void;
}

export function MapShell({ onSignOut }: MapShellProps) {
  const { user } = useAuth();
  const { jobs, loading } = useOpenJobs(user?.uid ?? null);
  const displayJobs: Array<Job | MockJob> = jobs.length ? jobs : mockJobs;
  const usingMockJobs = jobs.length === 0;
  const [followUser] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mockClaimedId, setMockClaimedId] = useState<string | null>(null);
  const [mockStatus, setMockStatus] = useState<
    'assigned' | 'enroute_pickup' | 'arrived_pickup' | 'picked_up' | 'enroute_dropoff' | 'arrived_dropoff' | 'completed'
  >('assigned');

  const getMarkerEmoji = (job: Job | MockJob) =>
    'type' in job && job.type === 'food' ? '🍔' : '📦';
  const isFoodJob = (job: Job | MockJob) => 'type' in job && job.type === 'food';
  const getPayoutText = (job: Job | MockJob) => {
    if ('payout' in job) return `$${job.payout.toFixed(2)}`;
    if (job.agreedFee != null) return `$${job.agreedFee.toFixed(2)}`;
    return '—';
  };
  const getPickupLabel = (job: Job | MockJob) =>
    (job.pickup as any).label || (job.pickup as any).address || 'Pickup';
  const getDropoffLabel = (job: Job | MockJob) =>
    (job.dropoff as any).label || (job.dropoff as any).address || 'Dropoff';
  const isLiveJob = (job: Job | MockJob): job is Job => 'status' in job;
  const isMockJob = (job: Job | MockJob): job is MockJob => !isLiveJob(job);
  const getEffectiveStatus = (job: Job): string => job.statusDetail ?? job.status;
  const isAssignedToMe = (job: Job) => !!user?.uid && job.courierUid === user.uid;
  const isClaimable = (job: Job) =>
    (getEffectiveStatus(job) === 'open' || getEffectiveStatus(job) === 'pending') &&
    (job.courierUid == null);
  const getNextStatus = (status: string): Job['status'] | null => {
    switch (status) {
      case 'in_progress':
        return 'enroute_pickup';
      case 'assigned':
        return 'enroute_pickup';
      case 'enroute_pickup':
        return 'arrived_pickup';
      case 'arrived_pickup':
        return 'picked_up';
      case 'picked_up':
        return 'enroute_dropoff';
      case 'enroute_dropoff':
        return 'arrived_dropoff';
      case 'arrived_dropoff':
        return 'completed';
      default:
        return null;
    }
  };

  const handleClaim = async (job: Job) => {
    if (!user?.uid) return;
    setError(null);
    setBusyJobId(job.id);
    try {
      await claimJob(job, user.uid, job.agreedFee ?? undefined);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to claim job');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleAdvance = async (job: Job) => {
    const nextStatus = getNextStatus(getEffectiveStatus(job));
    if (!nextStatus) return;
    setError(null);
    setBusyJobId(job.id);
    try {
      await updateJobStatus(job.id, nextStatus);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update status');
    } finally {
      setBusyJobId(null);
    }
  };

  const mockJob = displayJobs.find((job) => isMockJob(job) && job.id === mockClaimedId) as MockJob | undefined;
  const liveActiveJob = jobs.find(
    (job) => isAssignedToMe(job) && job.status !== 'completed' && job.status !== 'cancelled'
  );
  const advanceMockStatus = () => {
    const next: Record<typeof mockStatus, typeof mockStatus | 'completed'> = {
      assigned: 'enroute_pickup',
      enroute_pickup: 'arrived_pickup',
      arrived_pickup: 'picked_up',
      picked_up: 'enroute_dropoff',
      enroute_dropoff: 'arrived_dropoff',
      arrived_dropoff: 'completed',
      completed: 'completed',
    };
    setMockStatus(next[mockStatus] as typeof mockStatus);
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        logoEnabled={false}
        compassEnabled
      >
        <MapboxGL.Camera
          zoomLevel={11}
          centerCoordinate={[-96.797, 32.7767]}
          animationDuration={0}
          followUserLocation={followUser}
          followZoomLevel={12}
        />
        <MapboxGL.UserLocation visible />
        {displayJobs.map((job) => (
          <MapboxGL.MarkerView
            key={job.id}
            id={job.id}
            coordinate={[job.pickup.lng, job.pickup.lat]}
          >
            <View style={[styles.marker, isFoodJob(job) && styles.markerFood]}>
              <Text style={styles.markerText}>{getMarkerEmoji(job)}</Text>
            </View>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Courier V2</Text>
          <Text style={styles.subtitle}>Map shell (placeholder)</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.mapOverlay}>
        <Text style={styles.mapText}>Map shell ready</Text>
        <Text style={styles.mapSubtext}>Mapbox connected, jobs overlay next.</Text>
      </View>

      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Nearby jobs</Text>
        <Text style={styles.sourceBadge}>
          {usingMockJobs ? 'Mock data' : `Live jobs (${jobs.length})`}
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.jobMeta}>Loading jobs…</Text>}
        {!loading && displayJobs.length === 0 && (
          <Text style={styles.jobMeta}>No jobs available yet.</Text>
        )}
        {displayJobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobTitle}>
                {'title' in job ? job.title : 'Delivery job'}
              </Text>
              <Text style={styles.jobPayout}>{getPayoutText(job)}</Text>
            </View>
            <Text style={styles.jobMeta}>
              {getPickupLabel(job)} → {getDropoffLabel(job)}
            </Text>
            <Text style={styles.jobMeta}>
              {isLiveJob(job) ? `Live • ${getEffectiveStatus(job)}` : 'Mock'}
            </Text>
            {isLiveJob(job) && (
              <View style={styles.jobActions}>
                {isClaimable(job) && (
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => handleClaim(job)}
                    disabled={busyJobId === job.id}
                  >
                    {busyJobId === job.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Claim job</Text>
                    )}
                  </Pressable>
                )}
                {isAssignedToMe(job) && getNextStatus(job.status) && (
                  <Pressable
                    style={[styles.actionButton, styles.actionButtonAlt]}
                    onPress={() => handleAdvance(job)}
                    disabled={busyJobId === job.id}
                  >
                    {busyJobId === job.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Advance status</Text>
                    )}
                  </Pressable>
                )}
                {job.status !== 'open' && !isAssignedToMe(job) && (
                  <Text style={styles.jobMeta}>Status: {job.status}</Text>
                )}
              </View>
            )}
            {isMockJob(job) && (
              <View style={styles.jobActions}>
                {mockClaimedId === job.id ? (
                  <Text style={styles.jobMeta}>Claimed (mock)</Text>
                ) : (
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => setMockClaimedId(job.id)}
                  >
                    <Text style={styles.actionButtonText}>Claim (mock)</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      {mockJob && (
        <View style={styles.activePanel}>
          <Text style={styles.activeTitle}>Active job (mock)</Text>
          <Text style={styles.activeMeta}>
            {mockJob.title} • {mockStatus.replace('_', ' ')}
          </Text>
          <Text style={styles.activeMeta}>
            {mockJob.pickup.label} → {mockJob.dropoff.label}
          </Text>
          <Pressable style={styles.actionButton} onPress={advanceMockStatus}>
            <Text style={styles.actionButtonText}>
              {mockStatus === 'completed' ? 'Completed' : 'Advance status'}
            </Text>
          </Pressable>
        </View>
      )}

      {liveActiveJob && (
        <View style={[styles.activePanel, styles.activePanelLive]}>
          <Text style={styles.activeTitle}>Active job (live)</Text>
          <Text style={styles.activeMeta}>Status: {getEffectiveStatus(liveActiveJob)}</Text>
          <Text style={styles.activeMeta}>
            {getPickupLabel(liveActiveJob)} → {getDropoffLabel(liveActiveJob)}
          </Text>
          {getNextStatus(liveActiveJob.status) && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleAdvance(liveActiveJob)}
              disabled={busyJobId === liveActiveJob.id}
            >
              {busyJobId === liveActiveJob.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Advance status</Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
  },
  mapText: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '600',
  },
  mapSubtext: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 12,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B4EFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111827',
  },
  markerFood: {
    backgroundColor: '#F59E0B',
  },
  markerText: {
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
  },
  activePanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 170,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  activePanelLive: {
    borderColor: '#2563eb',
  },
  activeTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  activeMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  overlayTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sourceBadge: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#f87171',
    marginBottom: 8,
    fontSize: 12,
  },
  jobCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  jobPayout: {
    color: '#a7f3d0',
    fontSize: 14,
    fontWeight: '700',
  },
  jobMeta: {
    marginTop: 6,
    color: '#9ca3af',
    fontSize: 12,
  },
  jobActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonAlt: {
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
