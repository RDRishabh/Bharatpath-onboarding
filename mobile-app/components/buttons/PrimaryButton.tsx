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
  variant?: 'accent' | 'navy';
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
  variant = 'accent',
  style,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const isNavy = variant === 'navy';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        isNavy && styles.buttonNavy,
        disabled && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isNavy ? Colors.button.primaryNavyText : Colors.button.primaryText} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, isNavy && styles.labelNavy]}>{label}</Text>
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
    backgroundColor: Colors.button.primaryBg, // #5F4DB2
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
    minHeight: Layout.minTouchTarget,
  },
  buttonNavy: {
    backgroundColor: Colors.button.primaryNavyBg, // #0A1931
  },
  label: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.button.primaryText, // #FFFFFF
  },
  labelNavy: {
    color: Colors.button.primaryNavyText, // #FFFCF7
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
