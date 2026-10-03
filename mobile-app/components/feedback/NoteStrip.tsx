/**
 * NoteStrip - Compact info/advice strip with icon.
 * Variants: info (indigo), success (green), warning (amber), error (red).
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Lightbulb, CheckCircle, Warning, XCircle } from 'phosphor-react-native';
import { Colors, Typography, Radii, Spacing } from '@/theme/tokens';

type NoteVariant = 'info' | 'success' | 'warning' | 'error';

interface NoteStripProps {
  text: string;
  variant?: NoteVariant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const variantConfig: Record<NoteVariant, { bg: string; fg: string; icon: ReactNode }> = {
  info: {
    bg: Colors.indigoSemantic.bg,
    fg: Colors.indigoSemantic.fg,
    icon: <Lightbulb size={18} color={Colors.indigoSemantic.fg} weight="duotone" />,
  },
  success: {
    bg: Colors.green.bg,
    fg: Colors.green.fg,
    icon: <CheckCircle size={18} color={Colors.green.fg} weight="duotone" />,
  },
  warning: {
    bg: Colors.amber.bg,
    fg: Colors.amber.fg,
    icon: <Warning size={18} color={Colors.amber.fg} weight="duotone" />,
  },
  error: {
    bg: Colors.red.bg,
    fg: Colors.red.fg,
    icon: <XCircle size={18} color={Colors.red.fg} weight="duotone" />,
  },
};

export function NoteStrip({ text, variant = 'info', icon, style }: NoteStripProps) {
  const config = variantConfig[variant];
  return (
    <View style={[styles.strip, { backgroundColor: config.bg }, style]}>
      {icon ?? config.icon}
      <Text style={[styles.text, { color: config.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderRadius: Radii.card,
  },
  text: {
    ...Typography.caption,
    flex: 1,
    flexShrink: 1,
  },
});
