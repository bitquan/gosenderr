import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';

export const SettingsScreen = (): React.JSX.Element => {
  const {session, signOutUser} = useAuth();
  const {location: locationService} = useServiceRegistry();
  const {state, requestPermission, startTracking, stopTracking} = locationService.useLocationTracking();

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.text}>Signed in as {session?.email ?? 'unknown'}</Text>
        <Text style={styles.text}>Provider: {session?.provider ?? 'none'}</Text>
        <PrimaryButton
          label="Sign out"
          variant="danger"
          onPress={() => {
            void signOutUser();
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Location Permissions</Text>
        <Text style={styles.text}>Permission: {state.hasPermission ? 'Granted' : 'Not granted'}</Text>
        <Text style={styles.text}>Tracking: {state.tracking ? 'Active' : 'Inactive'}</Text>
        {state.lastLocation ? (
          <Text style={styles.text}>
            Last: {state.lastLocation.latitude.toFixed(5)}, {state.lastLocation.longitude.toFixed(5)}
          </Text>
        ) : null}
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

        <View style={styles.row}>
          <PrimaryButton
            label="Request Permission"
            variant="secondary"
            onPress={() => {
              void requestPermission();
            }}
          />
          <PrimaryButton
            label="Start"
            onPress={() => {
              void startTracking();
            }}
          />
          <PrimaryButton label="Stop" variant="secondary" onPress={stopTracking} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  text: {
    color: '#374151',
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});
