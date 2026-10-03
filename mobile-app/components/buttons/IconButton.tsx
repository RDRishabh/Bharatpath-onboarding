/**
 * IconButton - Icon-only circular button with accessible label.
 * Scales to .96 on press. Minimum 44px touch target.
 */
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing, Layout } from '@/theme/tokens';

interface IconButtonProps {
  onPress?: () => void;
  icon: ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
  variant?: 'default' | 'navy' | 'ghost';
  size?: number;
  style?: ViewStyle;
}

export function IconButton({
  onPress,
  icon,
  accessibilityLabel,
  disabled = false,
  variant = 'default',
  size = 44,
  style,
}: IconButtonProps) {
  const variantStyle = {
    default: { backgroundColor: Colors.surface.tint, borderWidth: 1, borderColor: Colors.surface.border },
    navy: { backgroundColor: Colors.navy },
    ghost: { backgroundColor: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        variantStyle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});
