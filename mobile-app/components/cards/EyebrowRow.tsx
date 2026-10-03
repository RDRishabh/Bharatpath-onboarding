/**
 * EyebrowRow - Mono eyebrow label (uppercase) with optional icon.
 * Used above section titles and card content.
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '@/theme/tokens';

interface EyebrowRowProps {
  label: string;
  icon?: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function EyebrowRow({ label, icon, color, style }: EyebrowRowProps) {
  const textColor = color ?? Colors.text.muted;
  return (
    <View style={[styles.row, style]}>
      {icon}
      <Text style={[styles.label, { color: textColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    ...Typography.monoEyebrow,
  },
});
