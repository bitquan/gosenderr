import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

type LoadingStateProps = {
  title: string;
  message?: string;
  compact?: boolean;
};

export const LoadingState = ({title, message, compact = false}: LoadingStateProps): React.JSX.Element => {
  return (
    <View style={[styles.card, compact ? styles.compactCard : null]}>
      <ActivityIndicator size="small" color="#1453ff" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
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
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: '#4b5563',
    fontSize: 13,
  },
});
