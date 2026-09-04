/**
 * PrimaryButton — Deep Navy fill, off-white text, 600 weight, ~16px text, 999px radius.
 * Never uses gold as background. Scales to .98 on press.
 */
import { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing, Layout } from '@/theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.button.primaryText} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={styles.label}>{label}</Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.button.primaryBg,
    paddingVertical: Spacing.opt14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
    minHeight: Layout.minTouchTarget,
  },
  label: {
    ...Typography.button,
    color: Colors.button.primaryText,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
