import React, {useMemo, useState} from 'react';
import {Linking, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {isMockAuthEnabled} from '../config/runtime';
import {useAuth} from '../context/AuthContext';
import {
  classifyUnknownError,
  getErrorResolution,
  type AppError,
} from '../services/errorSystem';
import {senderrTheme} from '../theme/senderrTheme';

export const LoginScreen = (): React.JSX.Element => {
  const {signInWithEmail, signUpWithEmail, signingIn, signingUp} = useAuth();
  const mockAuthEnabled = isMockAuthEnabled();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('courier@example.com');
  const [password, setPassword] = useState('DemoPass123!');
  const [confirmPassword, setConfirmPassword] = useState('DemoPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const submitting = signingIn || signingUp;
  const actionLabel = useMemo(() => {
    if (mode === 'signup') {
      return submitting ? 'Creating account...' : 'Create account';
    }
    return submitting ? 'Signing in...' : 'Sign in';
  }, [mode, submitting]);

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError(
          classifyUnknownError(new Error('Full name is required.'), {
            source: 'login_sign_up',
            fallbackMessage: 'Unable to create account.',
          }),
        );
        return;
      }
      if (password !== confirmPassword) {
        setError(
          classifyUnknownError(new Error('Passwords do not match.'), {
            source: 'login_sign_up',
            fallbackMessage: 'Unable to create account.',
          }),
        );
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, fullName);
        return;
      }
      await signInWithEmail(email, password);
    } catch (submitError) {
      const classified = classifyUnknownError(submitError, {
        source: mode === 'signup' ? 'login_sign_up' : 'login_sign_in',
        fallbackMessage: mode === 'signup' ? 'Unable to create account.' : 'Unable to sign in.',
      });
      setError(classified);
    }
  };

  const errorResolution = error ? getErrorResolution(error) : null;

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>Courier App</Text>
        <Text style={styles.heroTitle}>Senderr</Text>
        <Text style={styles.heroDescription}>Fast local deliveries powered by dispatch intelligence.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Pressable
            testID="auth-mode-signin"
            style={[styles.switchButton, mode === 'signin' ? styles.switchButtonActive : null]}
            onPress={() => {
              setMode('signin');
              setError(null);
            }}>
            <Text style={[styles.switchLabel, mode === 'signin' ? styles.switchLabelActive : null]}>Sign in</Text>
          </Pressable>
          <Pressable
            testID="auth-mode-signup"
            style={[styles.switchButton, mode === 'signup' ? styles.switchButtonActive : null]}
            onPress={() => {
              setMode('signup');
              setError(null);
            }}>
            <Text style={[styles.switchLabel, mode === 'signup' ? styles.switchLabelActive : null]}>Sign up</Text>
          </Pressable>
        </View>

        <Text style={styles.kicker}>Senderr Courier</Text>
        <Text style={styles.title}>{mode === 'signup' ? 'Create your courier account' : 'Sign in to continue'}</Text>
        <Text style={styles.description}>
          {mode === 'signup'
            ? 'Create your account to start onboarding and setup courier profile details.'
            : 'Use your courier account to access jobs, update delivery status, and track route progress.'}
        </Text>

        {mode === 'signup' ? (
          <>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              autoCorrect={false}
              placeholder="Full name"
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              testID="auth-fullname"
              accessibilityLabel="Full name"
            />
          </>
        ) : null}

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          testID="auth-email"
          accessibilityLabel="Email"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            style={[styles.input, {flex: 1}]}
            value={password}
            onChangeText={setPassword}
            testID="auth-password"
            accessibilityLabel="Password"
          />
          <Pressable
            testID="auth-password-toggle"
            accessibilityRole="button"
            onPress={() => setShowPassword(prev => !prev)}
            style={{marginLeft: 8, justifyContent: 'center'}}>
            <Text style={styles.passwordToggle}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>

        {mode === 'signin' ? (
          <Pressable testID="forgot-password" onPress={() => {}}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        ) : null}

        {mode === 'signup' ? (
          <>
            <Text style={styles.inputLabel}>Confirm password</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Confirm password"
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, {flex: 1}]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                testID="auth-password-confirm"
                accessibilityLabel="Confirm password"
              />
              <Pressable
                testID="auth-password-confirm-toggle"
                accessibilityRole="button"
                onPress={() => setShowConfirmPassword(prev => !prev)}
                style={{marginLeft: 8, justifyContent: 'center'}}>
                <Text style={styles.passwordToggle}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </>
        ) : null} 

        {error ? <Text style={styles.error}>{error.userMessage}</Text> : null}
        {error && errorResolution?.action === 'retry' ? (
          <PrimaryButton
            label={mode === 'signup' ? 'Retry Sign Up' : 'Retry Sign In'}
            variant="secondary"
            onPress={() => {
              void handleSubmit();
            }}
          />
        ) : null}
        {error && errorResolution?.action === 'open_settings' ? (
          <PrimaryButton
            label="Open Settings"
            variant="secondary"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        ) : null}
        {errorResolution?.escalationMessage ? (
          <Text style={styles.hint}>{errorResolution.escalationMessage}</Text>
        ) : null}

        <PrimaryButton
          label={actionLabel}
          disabled={submitting}
          onPress={() => {
            void handleSubmit();
          }}
        />

        <Text style={styles.hint}>
          {mockAuthEnabled
            ? 'Mock auth is enabled for local development only.'
            : 'Firebase auth is required. Configure SENDERR_FIREBASE_* values to sign in.'}
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: senderrTheme.colors.brandPrimary,
    gap: 4,
    shadowColor: '#1F2338',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
  },
  heroBadge: {
    color: '#E7E2FF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  heroDescription: {
    color: '#EDEAFF',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
    shadowColor: '#1F2338',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: senderrTheme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 4,
    gap: 6,
    marginBottom: 2,
  },
  switchButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonActive: {
    backgroundColor: senderrTheme.colors.surface,
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
  },
  switchLabel: {
    color: senderrTheme.colors.textMuted,
    fontWeight: '700',
  },
  switchLabelActive: {
    color: senderrTheme.colors.brandPrimary,
  },
  kicker: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  description: {
    color: senderrTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: senderrTheme.colors.surfaceMuted,
    color: senderrTheme.colors.textPrimary,
    marginBottom: 10,
  },
  inputLabel: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordToggle: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  forgot: {
    color: senderrTheme.colors.brandPrimary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 8,
  },
  error: {
    color: senderrTheme.colors.danger,
    fontWeight: '600',
  },
  hint: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
