import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Props = {
  uid: string;
  initialProfile?: Record<string, any>;
  rejectionReason?: string;
  onSignOut: () => Promise<void>;
};

type Step = 1 | 2 | 3 | 4;

const vehicleOptions = ['foot', 'bike', 'scooter', 'car', 'van', 'truck'];

export function CourierOnboarding({ uid, initialProfile, rejectionReason, onSignOut }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleType, setVehicleType] = useState(String(initialProfile?.vehicleType || 'car'));
  const [serviceRadius, setServiceRadius] = useState(String(initialProfile?.serviceRadius || '15'));
  const [legalName, setLegalName] = useState(String(initialProfile?.identity?.legalName || ''));
  const [phone, setPhone] = useState(String(initialProfile?.phone || ''));
  const [packagesEnabled, setPackagesEnabled] = useState(Boolean(initialProfile?.workModes?.packagesEnabled));
  const [foodEnabled, setFoodEnabled] = useState(Boolean(initialProfile?.workModes?.foodEnabled));

  const [packageBaseFare, setPackageBaseFare] = useState(
    String(initialProfile?.packageRateCard?.baseFare ?? '3'),
  );
  const [packagePerMile, setPackagePerMile] = useState(
    String(initialProfile?.packageRateCard?.perMile ?? '0.5'),
  );
  const [foodBaseFare, setFoodBaseFare] = useState(
    String(initialProfile?.foodRateCard?.baseFare ?? '2.5'),
  );
  const [foodPerMile, setFoodPerMile] = useState(
    String(initialProfile?.foodRateCard?.perMile ?? '0.75'),
  );

  const progress = useMemo(() => `${step}/4`, [step]);

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!vehicleType) return 'Select a vehicle type.';
      const radius = Number(serviceRadius);
      if (!Number.isFinite(radius) || radius <= 0) {
        return 'Enter a valid service radius.';
      }
    }

    if (step === 2) {
      if (!legalName.trim()) return 'Enter your legal name.';
      if (!phone.trim()) return 'Enter your phone number.';
    }

    if (step === 3) {
      if (!packagesEnabled && !foodEnabled) {
        return 'Enable at least one work mode.';
      }
    }

    if (step === 4) {
      if (packagesEnabled) {
        const base = Number(packageBaseFare);
        const perMile = Number(packagePerMile);
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(perMile) || perMile <= 0) {
          return 'Package rate card values must be positive numbers.';
        }
      }
      if (foodEnabled) {
        const base = Number(foodBaseFare);
        const perMile = Number(foodPerMile);
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(perMile) || perMile <= 0) {
          return 'Food rate card values must be positive numbers.';
        }
      }
    }

    return null;
  };

  const handleNext = () => {
    const stepError = validateStep();
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((prev) => Math.min(4, prev + 1) as Step);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1) as Step);
  };

  const handleSubmit = async () => {
    const stepError = validateStep();
    if (stepError) {
      setError(stepError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          role: 'courier',
          updatedAt: serverTimestamp(),
          courierProfile: {
            ...initialProfile,
            onboardingCompleted: true,
            onboardingSubmittedAt: serverTimestamp(),
            status: 'pending',
            isOnline: false,
            vehicleType,
            serviceRadius: Number(serviceRadius),
            phone: phone.trim(),
            identity: {
              ...(initialProfile?.identity || {}),
              legalName: legalName.trim(),
            },
            workModes: {
              packagesEnabled,
              foodEnabled,
            },
            packageRateCard: packagesEnabled
              ? {
                  ...(initialProfile?.packageRateCard || {}),
                  baseFare: Number(packageBaseFare),
                  perMile: Number(packagePerMile),
                  perMinute: Number(initialProfile?.packageRateCard?.perMinute ?? 0.1),
                  optionalFees: initialProfile?.packageRateCard?.optionalFees || [],
                }
              : initialProfile?.packageRateCard || null,
            foodRateCard: foodEnabled
              ? {
                  ...(initialProfile?.foodRateCard || {}),
                  baseFare: Number(foodBaseFare),
                  perMile: Number(foodPerMile),
                  restaurantWaitPay: Number(initialProfile?.foodRateCard?.restaurantWaitPay ?? 0.15),
                  optionalFees: initialProfile?.foodRateCard?.optionalFees || [],
                }
              : initialProfile?.foodRateCard || null,
          },
        },
        { merge: true },
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to submit onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle & Radius</Text>
          <Text style={styles.cardText}>Match your delivery setup with senderr web courier onboarding.</Text>
          <Text style={styles.label}>Vehicle type</Text>
          <View style={styles.chipsWrap}>
            {vehicleOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, vehicleType === option && styles.chipActive]}
                onPress={() => setVehicleType(option)}
              >
                <Text style={[styles.chipText, vehicleType === option && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Service radius (miles)</Text>
          <TextInput
            value={serviceRadius}
            onChangeText={setServiceRadius}
            keyboardType="decimal-pad"
            placeholder="15"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identity & Contact</Text>
          <Text style={styles.label}>Legal name</Text>
          <TextInput
            value={legalName}
            onChangeText={setLegalName}
            placeholder="Full legal name"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 000-0000"
            placeholderTextColor="#6b7280"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Modes</Text>
          <Text style={styles.cardText}>Choose at least one mode to continue.</Text>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Packages</Text>
              <Text style={styles.switchSubtitle}>General package deliveries</Text>
            </View>
            <Switch value={packagesEnabled} onValueChange={setPackagesEnabled} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Food</Text>
              <Text style={styles.switchSubtitle}>Restaurant and food pickup jobs</Text>
            </View>
            <Switch value={foodEnabled} onValueChange={setFoodEnabled} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rate Cards</Text>
        <Text style={styles.cardText}>Set core rates like the web onboarding flow.</Text>

        {packagesEnabled && (
          <View style={styles.rateBlock}>
            <Text style={styles.rateTitle}>Package delivery</Text>
            <TextInput
              value={packageBaseFare}
              onChangeText={setPackageBaseFare}
              keyboardType="decimal-pad"
              placeholder="Base fare"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <TextInput
              value={packagePerMile}
              onChangeText={setPackagePerMile}
              keyboardType="decimal-pad"
              placeholder="Per mile"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </View>
        )}

        {foodEnabled && (
          <View style={styles.rateBlock}>
            <Text style={styles.rateTitle}>Food delivery</Text>
            <TextInput
              value={foodBaseFare}
              onChangeText={setFoodBaseFare}
              keyboardType="decimal-pad"
              placeholder="Base fare"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <TextInput
              value={foodPerMile}
              onChangeText={setFoodPerMile}
              keyboardType="decimal-pad"
              placeholder="Per mile"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SENDERR COURIER</Text>
        <Text style={styles.title}>Onboarding</Text>
        <Text style={styles.subtitle}>Step {progress} — complete your courier setup to match the web app experience.</Text>

        {rejectionReason ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Previous application needs updates</Text>
            <Text style={styles.warningText}>{rejectionReason}</Text>
          </View>
        ) : null}

        {renderStep()}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footerRow}>
          <Pressable style={styles.ghostButton} onPress={() => void onSignOut()} disabled={submitting}>
            <Text style={styles.ghostButtonText}>Sign Out</Text>
          </Pressable>
          <View style={styles.footerActions}>
            {step > 1 && (
              <Pressable style={styles.secondaryButton} onPress={handleBack} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            )}
            {step < 4 ? (
              <Pressable style={styles.primaryButton} onPress={handleNext} disabled={submitting}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 6,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#3f1d2e',
    borderColor: '#9f1239',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  warningTitle: {
    color: '#fecdd3',
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    color: '#ffd4dd',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    backgroundColor: '#0b1220',
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  chipActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#312e81',
  },
  chipText: {
    color: '#cbd5e1',
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ede9fe',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  switchTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  switchSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  rateBlock: {
    marginTop: 8,
    marginBottom: 6,
  },
  rateTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 8,
  },
  error: {
    color: '#fb7185',
    marginTop: 12,
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minWidth: 92,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minWidth: 88,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#d8ccff',
    fontWeight: '700',
  },
  ghostButton: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  ghostButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
});
