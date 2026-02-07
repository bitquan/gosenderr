import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View, type ViewStyle} from 'react-native';

export const ScreenContainer = ({
  children,
  contentStyle,
}: {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}): React.JSX.Element => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
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
