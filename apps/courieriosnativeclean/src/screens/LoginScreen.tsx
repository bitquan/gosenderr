import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {isMockAuthEnabled} from '../config/runtime';
import {useAuth} from '../context/AuthContext';

export const LoginScreen = (): React.JSX.Element => {
  const {signInWithEmail, signingIn} = useAuth();
  const mockAuthEnabled = isMockAuthEnabled();
  const [email, setEmail] = useState('courier@example.com');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (): Promise<void> => {
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message : 'Unable to sign in.';
      setError(message);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Senderr Courier</Text>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.description}>
          Use your courier account to access jobs, update delivery status, and track route progress.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={signingIn ? 'Signing in...' : 'Sign In'}
          disabled={signingIn}
          onPress={() => {
            void handleSignIn();
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
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    gap: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
  kicker: {
    color: '#1453ff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  description: {
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
});
