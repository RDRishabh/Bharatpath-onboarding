/**
 * CTAStickyBand — Sticky bottom call-to-action with title, subtitle, and button.
 * Designed to sit above the floating bottom navigation.
 */
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { Colors, Typography, Radii, Spacing } from '@/theme/tokens';

interface CTAStickyBandProps {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  onCTAPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CTAStickyBand({ title, subtitle, ctaLabel, onCTAPress, style }: CTAStickyBandProps) {
  return (
    <View style={[styles.band, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <PrimaryButton label={ctaLabel} onPress={onCTAPress} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: Radii.card,
    padding: Spacing.base,
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.navy,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.muted,
    marginTop: 2,
  },
  button: {
    flexShrink: 0,
  paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
