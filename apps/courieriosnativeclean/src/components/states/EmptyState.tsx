import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../PrimaryButton';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export const EmptyState = ({
  title,
  message,
  actionLabel = 'Refresh',
  onAction,
  compact = false,
}: EmptyStateProps): React.JSX.Element => {
  return (
    <View style={[styles.card, compact ? styles.compactCard : null]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onAction ? (
        <PrimaryButton
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbe3f0',
  },
  compactCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: '#4b5563',
    fontSize: 13,
  },
});
