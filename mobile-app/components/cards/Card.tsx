/**
 * Card — Primary container with border (not shadow), 22px radius, white surface.
 * Supports optional header, body, and footer slots.
 */
import { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'tint' | 'navy';
  padding?: number;
}

export function Card({ children, style, onPress, variant = 'default', padding }: CardProps) {
  const bg = {
    default: { backgroundColor: Colors.surface.card, borderColor: Colors.surface.border },
    tint: { backgroundColor: Colors.surface.tint, borderColor: Colors.surface.border },
    navy: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  }[variant];

  const content = (
    <View style={[styles.card, bg, padding !== undefined && { padding }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.base,
  overflow: 'hidden',
  width: '100%',
  },
  pressed: {
    opacity: 0.92,
  transform: [{ scale: 0.99 }],
  },
});
