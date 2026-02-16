import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {senderrTheme} from '../../theme/senderrTheme';

type LoadingStateProps = {
  title: string;
  message?: string;
  compact?: boolean;
};

export const LoadingState = ({title, message, compact = false}: LoadingStateProps): React.JSX.Element => {
  return (
    <View style={[styles.card, compact ? styles.compactCard : null]}>
      <ActivityIndicator size="small" color={senderrTheme.colors.brandPrimary} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textWrap: {
    flex: 1,
    gap: 2,
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
