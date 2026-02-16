import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../PrimaryButton';

type ErrorStateProps = {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export const ErrorState = ({
  title,
  message,
  retryLabel = 'Retry',
  onRetry,
  compact = false,
}: ErrorStateProps): React.JSX.Element => {
  return (
    <View style={[styles.card, compact ? styles.compactCard : null]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PrimaryButton
          label={retryLabel}
          variant="secondary"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  compactCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: '#7F1D1D',
    fontSize: 13,
  },
});
