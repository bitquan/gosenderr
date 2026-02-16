import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View, type ViewStyle} from 'react-native';

import {senderrTheme} from '../theme/senderrTheme';

export const ScreenContainer = ({
  children,
  contentStyle,
  scroll = true,
}: {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
}): React.JSX.Element => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: senderrTheme.colors.background,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});
