import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Job } from '../types/job';

interface JobDetailSheetProps {
  visible: boolean;
  job: Job | null;
  onClose: () => void;
}

const formatPhone = (value?: string | null) => (value ? value : 'Not provided');

export function JobDetailSheet({ visible, job, onClose }: JobDetailSheetProps) {
  if (!job) return null;

  const pickupLabel = job.pickup?.label || job.pickup?.address || 'Pickup';
  const dropoffLabel = job.dropoff?.label || job.dropoff?.address || 'Dropoff';
  const pickupPhone = job.pickup?.contactPhone || job.senderPhone || job.customerPhone;
  const dropoffPhone = job.dropoff?.contactPhone || job.recipientPhone || job.customerPhone;
  const pickupName = job.pickup?.contactName || job.senderName || job.customerName;
  const dropoffName = job.dropoff?.contactName || job.recipientName || job.customerName;

  const handleCall = async (phone?: string | null) => {
    if (!phone) return;
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleNavigate = async (lat: number, lng: number, label: string) => {
    const url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Job details</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pickup</Text>
              <Text style={styles.sectionBody}>{pickupLabel}</Text>
              {pickupName ? <Text style={styles.sectionMeta}>{pickupName}</Text> : null}
              <Text style={styles.sectionMeta}>{formatPhone(pickupPhone)}</Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleNavigate(job.pickup.lat, job.pickup.lng, pickupLabel)}
                >
                  <Text style={styles.actionButtonText}>Navigate to pickup</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.actionButtonAlt]}
                  onPress={() => handleCall(pickupPhone)}
                >
                  <Text style={styles.actionButtonText}>Call pickup</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dropoff</Text>
              <Text style={styles.sectionBody}>{dropoffLabel}</Text>
              {dropoffName ? <Text style={styles.sectionMeta}>{dropoffName}</Text> : null}
              <Text style={styles.sectionMeta}>{formatPhone(dropoffPhone)}</Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleNavigate(job.dropoff.lat, job.dropoff.lng, dropoffLabel)}
                >
                  <Text style={styles.actionButtonText}>Navigate to dropoff</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.actionButtonAlt]}
                  onPress={() => handleCall(dropoffPhone)}
                >
                  <Text style={styles.actionButtonText}>Call dropoff</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Package</Text>
              <Text style={styles.sectionBody}>{job.package?.size || 'Standard'}</Text>
              {job.package?.notes ? (
                <Text style={styles.sectionMeta}>{job.package.notes}</Text>
              ) : (
                <Text style={styles.sectionMeta}>No special instructions.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job</Text>
              <Text style={styles.sectionMeta}>Status: {job.statusDetail ?? job.status}</Text>
              <Text style={styles.sectionMeta}>Job ID: {job.id}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '85%',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  closeButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 18,
  },
  section: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionBody: {
    color: '#cbd5f5',
    fontSize: 12,
    marginBottom: 6,
  },
  sectionMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonAlt: {
    backgroundColor: '#1f2937',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
