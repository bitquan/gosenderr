/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { AuthProvider } from './src/contexts/AuthContext';
import { CourierOnboarding } from './src/components/CourierOnboarding';
import { useAuth } from './src/hooks/useAuth';
import { useFeatureFlags } from './src/hooks/useFeatureFlags';
import { db, isFirebaseReady } from './src/lib/firebase';
import { MapShell } from './src/screens/MapShell';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const [userDoc, setUserDoc] = useState<Record<string, any> | null>(null);
  const [userDocLoading, setUserDocLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [devOverride, setDevOverride] = useState(false);

  const firebaseReady = isFirebaseReady();
  const isNativeEnabled = Boolean(flags?.courier?.nativeV2) || (__DEV__ && devOverride);

  useEffect(() => {
    if (!firebaseReady || !user?.uid) {
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setUserDoc(snapshot.exists() ? (snapshot.data() as Record<string, any>) : null);
        setUserDocLoading(false);
      },
      () => setUserDocLoading(false),
    );

    return unsubscribe;
  }, [firebaseReady, user?.uid]);

  const courierProfile = userDoc?.courierProfile || {};
  const courierStatus = String(courierProfile?.status || '').toLowerCase();
  const onboardingCompleted = Boolean(courierProfile?.onboardingCompleted);
  const rejectionReason =
    typeof courierProfile?.rejectionReason === 'string' ? courierProfile.rejectionReason : '';

  const canEnterMapShell =
    firebaseReady &&
    !authLoading &&
    !!user &&
    !flagsLoading &&
    !userDocLoading &&
    isNativeEnabled &&
    (courierStatus === 'approved' || (__DEV__ && devOverride));

  const showOnboarding =
    firebaseReady &&
    !authLoading &&
    !!user &&
    !flagsLoading &&
    !userDocLoading &&
    isNativeEnabled &&
    (courierStatus === 'rejected' || !onboardingCompleted);

  const showPendingReview =
    firebaseReady &&
    !authLoading &&
    !!user &&
    !flagsLoading &&
    !userDocLoading &&
    isNativeEnabled &&
    courierStatus === 'pending';

  const handleSignIn = async () => {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed');
    }
  };

  if (canEnterMapShell) {
    return (
      <View style={styles.fullScreen}>
        <MapShell onSignOut={signOut} />
      </View>
    );
  }

  if (showOnboarding && user?.uid) {
    return (
      <View style={styles.fullScreen}>
        <CourierOnboarding
          uid={user.uid}
          initialProfile={courierProfile}
          rejectionReason={rejectionReason || undefined}
          onSignOut={signOut}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top + 24 }]}> 
      <Text style={styles.title}>GoSenderr Courier V2</Text>
      <Text style={styles.subtitle}>Native courier app</Text>

      {!firebaseReady && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Firebase not configured</Text>
          <Text style={styles.item}>Update firebase config to enable auth + flags.</Text>
        </View>
      )}

      {firebaseReady && authLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.item}>Loading auth…</Text>
        </View>
      )}

      {firebaseReady && !authLoading && !user && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sign in</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleSignIn}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
      )}

      {firebaseReady && !authLoading && user && flagsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.item}>Loading feature flags…</Text>
        </View>
      )}

      {firebaseReady && !authLoading && user && !flagsLoading && isNativeEnabled && userDocLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.item}>Loading courier profile…</Text>
        </View>
      )}

      {showPendingReview && (
        <ScrollView style={styles.pendingWrap} contentContainerStyle={styles.pendingContent}>
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Application Under Review</Text>
            <Text style={styles.pendingText}>
              Your onboarding is submitted and pending approval. You’ll be able to go online once approved.
            </Text>
            <Pressable style={styles.ghostButton} onPress={signOut}>
              <Text style={styles.ghostButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {firebaseReady && !authLoading && user && !flagsLoading && !isNativeEnabled && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Feature disabled</Text>
          <Text style={styles.item}>Enable courier.nativeV2 in featureFlags/config.</Text>
          {__DEV__ && (
            <Pressable
              style={[styles.secondaryButton, devOverride && styles.secondaryButtonActive]}
              onPress={() => setDevOverride((prev) => !prev)}
            >
              <Text style={styles.secondaryButtonText}>
                {devOverride ? 'Disable' : 'Enable'} Dev Override
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.ghostButton} onPress={signOut}>
            <Text style={styles.ghostButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#0b0f1a',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  item: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 6,
  },
  centered: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  pendingWrap: {
    marginTop: 16,
  },
  pendingContent: {
    paddingBottom: 28,
  },
  pendingCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  pendingTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  pendingText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    marginBottom: 12,
    backgroundColor: '#0b0f1a',
  },
  error: {
    color: '#f87171',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#6B4EFF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonActive: {
    backgroundColor: 'rgba(107, 78, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#c4b5fd',
    fontWeight: '600',
  },
  ghostButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#9ca3af',
  },
});

export default App;
