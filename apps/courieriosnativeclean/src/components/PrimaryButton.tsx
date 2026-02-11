import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

export const PrimaryButton = ({
  label,
  disabled,
  onPress,
  variant = 'primary',
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}): React.JSX.Element => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled}}
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled ? styles.disabled : null]}>
      <Text style={[styles.label, variant === 'secondary' ? styles.secondaryLabel : null]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: '#1453ff',
  },
  secondary: {
    backgroundColor: '#edf2ff',
  },
  danger: {
    backgroundColor: '#dc2626',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryLabel: {
    color: '#1453ff',
  },
});
