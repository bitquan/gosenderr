import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {senderrTheme} from '../../theme/senderrTheme';

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
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  compactCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 13,
  },
});
