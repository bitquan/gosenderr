/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {Suspense, lazy, useEffect, useState, useRef} from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
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
import {doc, onSnapshot} from 'firebase/firestore';
import {AuthProvider} from './src/contexts/AuthContext';
import {useAuth} from './src/hooks/useAuth';
import {useFeatureFlags} from './src/hooks/useFeatureFlags';
import {db, isFirebaseReady} from './src/lib/firebase';

const MapShell = lazy(async () => {
  const module = await import('./src/screens/MapShell');
  return {default: module.MapShell};
});

const CourierOnboarding = lazy(async () => {
  const module = await import('./src/components/CourierOnboarding');
  return {default: module.CourierOnboarding};
});

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
  const {user, loading: authLoading, signIn, signUp, signOut} = useAuth();
  const {flags, loading: flagsLoading} = useFeatureFlags();
  const [userDoc, setUserDoc] = useState<Record<string, any> | null>(null);
  const [userDocLoading, setUserDocLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authBusy, setAuthBusy] = useState(false);
  const [authUiReady, setAuthUiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOverride, setDevOverride] = useState(false);

  // Keep refs for return-key navigation and optional dev focus action.
  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);
  const mountedRef = useRef(true); // guard to avoid setState after unmount

  const firebaseReady = isFirebaseReady();
  const isNativeEnabled =
    Boolean(flags?.courier?.nativeV2) || (__DEV__ && devOverride);

  useEffect(() => {
    if (!firebaseReady || !user?.uid) {
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        if (!mountedRef.current) return;
        setUserDoc(
          snapshot.exists() ? (snapshot.data() as Record<string, any>) : null,
        );
        setUserDocLoading(false);
      },
      () => {
        if (!mountedRef.current) return;
        setUserDocLoading(false);
      },
    );

    return unsubscribe;
  }, [firebaseReady, user?.uid]);

  useEffect(() => {
    // mark unmounted to avoid setState in async handlers
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interactionHandle: {cancel?: () => void} | null = null;

    const shouldPrepareAuthUi = firebaseReady && !authLoading && !user;
    if (!shouldPrepareAuthUi) {
      setAuthUiReady(false);
      return;
    }

    setAuthUiReady(false);
    interactionHandle = InteractionManager.runAfterInteractions(() => {
      if (!cancelled && mountedRef.current) {
        setAuthUiReady(true);
      }
    });

    return () => {
      cancelled = true;
      interactionHandle?.cancel?.();
    };
  }, [firebaseReady, authLoading, user]);

  const courierProfile = userDoc?.courierProfile || {};
  const courierStatus = String(courierProfile?.status || '').toLowerCase();
  const onboardingCompleted = Boolean(courierProfile?.onboardingCompleted);
  const rejectionReason =
    typeof courierProfile?.rejectionReason === 'string'
      ? courierProfile.rejectionReason
      : '';

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

  const handleAuthSubmit = async () => {
    if (authBusy) return;
    if (!authUiReady) return;
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    if (authMode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        await signUp(normalizedEmail, password, fullName.trim() || undefined);
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(
          err?.message ??
            (authMode === 'signup' ? 'Sign up failed' : 'Sign in failed'),
        );
      }
    } finally {
      if (mountedRef.current) {
        setAuthBusy(false);
      }
    }
  };

  if (canEnterMapShell) {
    return (
      <View style={styles.fullScreen}>
        <Suspense
          fallback={
            <View style={styles.centered}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.item}>Loading map…</Text>
            </View>
          }>
          <MapShell onSignOut={signOut} />
        </Suspense>
      </View>
    );
  }

  if (showOnboarding && user?.uid) {
    return (
      <View style={styles.fullScreen}>
        <Suspense
          fallback={
            <View style={styles.centered}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.item}>Loading onboarding…</Text>
            </View>
          }>
          <CourierOnboarding
            uid={user.uid}
            initialProfile={courierProfile}
            rejectionReason={rejectionReason || undefined}
            onSignOut={signOut}
          />
        </Suspense>
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingTop: safeAreaInsets.top + 24}]}>
      <Text style={styles.title}>GoSenderr Courier V2</Text>
      <Text style={styles.subtitle}>Native courier app</Text>

      {!firebaseReady && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Firebase not configured</Text>
          <Text style={styles.item}>
            Update firebase config to enable auth + flags.
          </Text>
        </View>
      )}

      {firebaseReady && authLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.item}>Loading auth…</Text>
        </View>
      )}

      {firebaseReady && !authLoading && !user && (
        <KeyboardAvoidingView
          style={styles.authRoot}
          behavior={Platform.select({ios: 'padding', android: undefined})}
          keyboardVerticalOffset={safeAreaInsets.top + 16}>
          <ScrollView
            style={styles.authScroll}
            contentContainerStyle={styles.authScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}>
            <View style={styles.authCard}>
              {!authUiReady && (
                <View style={styles.authInitWrap}>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.item}>Preparing sign in…</Text>
                </View>
              )}
              <View style={styles.authModeToggle}>
                <Pressable
                  style={[
                    styles.authModeButton,
                    authMode === 'signin' && styles.authModeButtonActive,
                  ]}
                  disabled={!authUiReady || authBusy}
                  onPress={() => {
                    setAuthMode('signin');
                    setError(null);
                  }}>
                  <Text
                    style={[
                      styles.authModeText,
                      authMode === 'signin' && styles.authModeTextActive,
                    ]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.authModeButton,
                    authMode === 'signup' && styles.authModeButtonActive,
                  ]}
                  disabled={!authUiReady || authBusy}
                  onPress={() => {
                    setAuthMode('signup');
                    setError(null);
                  }}>
                  <Text
                    style={[
                      styles.authModeText,
                      authMode === 'signup' && styles.authModeTextActive,
                    ]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>
                {authMode === 'signup'
                  ? 'Create courier account'
                  : 'Welcome back'}
              </Text>

              {authMode === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={authUiReady && !authBusy}
                />
              )}

              <TextInput
                ref={ref => (emailInputRef.current = ref)}
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="username"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={setEmail}
                editable={authUiReady && !authBusy}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
              />
              <TextInput
                ref={ref => (passwordInputRef.current = ref)}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCorrect={false}
                spellCheck={false}
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                editable={authUiReady && !authBusy}
                onSubmitEditing={handleAuthSubmit}
              />

              {/* DEV helpers: quick-fill + manual focus for faster auth iteration */}
              {__DEV__ && (
                <View style={{flexDirection: 'row', marginTop: 8}}>
                  <Pressable
                    style={[styles.ghostButton, {marginRight: 8}]}
                    onPress={() => {
                      setEmail('test@gosenderr.com');
                      setPassword('TestPass123');
                    }}>
                    <Text style={styles.ghostButtonText}>Quick Fill</Text>
                  </Pressable>

                  <Pressable
                    style={styles.ghostButton}
                    onPress={() => {
                      emailInputRef.current?.focus();
                    }}>
                    <Text style={styles.ghostButtonText}>Force Focus</Text>
                  </Pressable>
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={[
                  styles.primaryButton,
                  (authBusy || !authUiReady) && styles.primaryButtonDisabled,
                ]}
                onPress={handleAuthSubmit}
                disabled={authBusy || !authUiReady}>
                {authBusy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {firebaseReady && !authLoading && user && flagsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.item}>Loading feature flags…</Text>
        </View>
      )}

      {firebaseReady &&
        !authLoading &&
        user &&
        !flagsLoading &&
        isNativeEnabled &&
        userDocLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.item}>Loading courier profile…</Text>
          </View>
        )}

      {showPendingReview && (
        <ScrollView
          style={styles.pendingWrap}
          contentContainerStyle={styles.pendingContent}>
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Application Under Review</Text>
            <Text style={styles.pendingText}>
              Your onboarding is submitted and pending approval. You’ll be able
              to go online once approved.
            </Text>
            <Pressable style={styles.ghostButton} onPress={signOut}>
              <Text style={styles.ghostButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {firebaseReady &&
        !authLoading &&
        user &&
        !flagsLoading &&
        !isNativeEnabled && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Feature disabled</Text>
            <Text style={styles.item}>
              Enable courier.nativeV2 in featureFlags/config.
            </Text>
            {__DEV__ && (
              <Pressable
                style={[
                  styles.secondaryButton,
                  devOverride && styles.secondaryButtonActive,
                ]}
                onPress={() => setDevOverride(prev => !prev)}>
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
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  authInitWrap: {
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  authRoot: {
    flex: 1,
  },
  authScroll: {
    flex: 1,
  },
  authScrollContent: {
    paddingBottom: 24,
  },
  authModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#0b0f1a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  authModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  authModeButtonActive: {
    backgroundColor: '#6B4EFF',
  },
  authModeText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  authModeTextActive: {
    color: '#ffffff',
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
