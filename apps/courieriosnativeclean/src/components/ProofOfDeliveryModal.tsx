import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  NativeModules,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Job } from '../types/job';
import { completeDeliveryWithProof, completePickupWithProof } from '../lib/jobs';

interface ProofOfDeliveryModalProps {
  visible: boolean;
  job: Job | null;
  courierUid: string | null;
  mode: 'pickup' | 'dropoff';
  location?: { lat: number; lng: number; accuracy?: number | null } | null;
  onClose: () => void;
  onCompleted: () => void;
}

const dropoffNotes = [
  'Left at front door',
  'Handed to resident',
  'Left at mailbox',
  'Left with building security',
  'Left in garage',
  'Left at back door',
];

const pickupNotes = [
  'Picked up from front desk',
  'Picked up from concierge',
  'Picked up from storefront',
  'Picked up from loading dock',
  'Picked up from staff',
  'Picked up curbside',
];

export function ProofOfDeliveryModal({
  visible,
  job,
  courierUid,
  mode,
  location,
  onClose,
  onCompleted,
}: ProofOfDeliveryModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPhotoPreview(null);
      setPhotoDataUrl(null);
      setNotes('');
      setSelectedNote(null);
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  const handleCapture = async (useCamera: boolean) => {
    try {
      const nativePicker =
        (NativeModules as any)?.ImagePickerManager || (NativeModules as any)?.RNImagePicker;
      if (!nativePicker) {
        setError('Image picker is not available. Please rebuild the iOS app.');
        return;
      }

      const picker = useCamera ? launchCamera : launchImageLibrary;
      const result = await picker({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.75,
        includeBase64: true,
        maxHeight: 1600,
        maxWidth: 1600,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        setError(result.errorMessage ?? 'Unable to access camera');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        setError('No photo captured');
        return;
      }

      const mime = asset.type ?? 'image/jpeg';
      const dataUrl = asset.base64
        ? `data:${mime};base64,${asset.base64}`
        : null;

      if (!dataUrl && !asset.uri) {
        setError('Photo data missing');
        return;
      }

      setPhotoDataUrl(dataUrl ?? null);
      setPhotoPreview(asset.uri ?? dataUrl);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to capture photo');
    }
  };

  const handleComplete = async () => {
    if (!job?.id || !courierUid || !photoDataUrl || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'pickup') {
        await completePickupWithProof({
          jobId: job.id,
          courierUid,
          photoDataUrl,
          notes: notes || selectedNote || undefined,
          location: location ?? null,
        });
      } else {
        await completeDeliveryWithProof({
          jobId: job.id,
          courierUid,
          photoDataUrl,
          notes: notes || selectedNote || undefined,
          location: location ?? null,
        });
      }
      onCompleted();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to complete delivery');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>
              {mode === 'pickup' ? 'Proof of pickup' : 'Proof of delivery'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'pickup'
                ? 'Capture a pickup photo and add a note for the customer.'
                : 'Capture a drop-off photo and add a note for the customer.'}
            </Text>
            {job && (
              <View style={styles.jobSummary}>
                <Text style={styles.jobSummaryTitle}>Delivery job</Text>
                <Text style={styles.jobSummaryMeta}>
                  {(job.pickup as any)?.label || (job.pickup as any)?.address || 'Pickup'} →{' '}
                  {(job.dropoff as any)?.label || (job.dropoff as any)?.address || 'Dropoff'}
                </Text>
              </View>
            )}

            {photoPreview ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photoPreview }} style={styles.photo} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => {
                    setPhotoPreview(null);
                    setPhotoDataUrl(null);
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📸</Text>
                <Text style={styles.photoLabel}>Add delivery photo</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <Pressable style={styles.captureButton} onPress={() => handleCapture(true)}>
                <Text style={styles.captureButtonText}>Take photo</Text>
              </Pressable>
              <Pressable style={styles.captureButtonAlt} onPress={() => handleCapture(false)}>
                <Text style={styles.captureButtonText}>Choose photo</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>
              {mode === 'pickup' ? 'Pickup location' : 'Delivery location'}
            </Text>
            <View style={styles.notesGrid}>
              {(mode === 'pickup' ? pickupNotes : dropoffNotes).map((note) => (
                <Pressable
                  key={note}
                  style={[
                    styles.noteChip,
                    selectedNote === note && styles.noteChipActive,
                  ]}
                  onPress={() => setSelectedNote(note)}
                >
                  <Text
                    style={[
                      styles.noteChipText,
                      selectedNote === note && styles.noteChipTextActive,
                    ]}
                  >
                    {note}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Additional notes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Add optional details"
              placeholderTextColor="#64748b"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.footer}>
              <Pressable style={styles.cancelButton} onPress={onClose} disabled={busy}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.completeButton,
                  (!photoDataUrl || busy) && styles.completeButtonDisabled,
                ]}
                onPress={handleComplete}
                disabled={!photoDataUrl || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.completeButtonText}>
                    {mode === 'pickup' ? 'Confirm pickup' : 'Complete delivery'}
                  </Text>
                )}
              </Pressable>
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
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  jobSummary: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    marginBottom: 16,
  },
  jobSummaryTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  jobSummaryMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  photoWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 220,
  },
  removeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  removeButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  photoPlaceholder: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 18,
  },
  captureButton: {
    flex: 1,
    backgroundColor: '#6b4eff',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureButtonAlt: {
    flex: 1,
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  noteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteChipActive: {
    backgroundColor: '#6b4eff',
    borderColor: '#6b4eff',
  },
  noteChipText: {
    color: '#cbd5f5',
    fontSize: 11,
  },
  noteChipTextActive: {
    color: '#fff',
  },
  textInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    color: '#e2e8f0',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f87171',
    marginTop: 10,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelButtonText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  completeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
