import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

import {senderrTheme} from '../theme/senderrTheme';

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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: senderrTheme.colors.brandPrimary,
  },
  secondary: {
    backgroundColor: senderrTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
  },
  danger: {
    backgroundColor: senderrTheme.colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: senderrTheme.colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryLabel: {
    color: senderrTheme.colors.brandPrimary,
  },
});
