/**
 * TertiaryButton — Lightweight action, may use icon circles.
 * No border, subtle press feedback. Scales to .98 on press.
 */
import { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing, Layout } from '@/theme/tokens';

interface TertiaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function TertiaryButton({
  label,
  onPress,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: TertiaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {leftIcon}
      <Text style={styles.label}>{label}</Text>
      {rightIcon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    minHeight: Layout.minTouchTarget,
  },
  label: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.indigo,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
});
