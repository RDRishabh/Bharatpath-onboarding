/**
 * SkillChip - Pill-shaped tag for skills/technologies.
 * Light surface with border, sentence case, General Sans.
 */
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '@/theme/tokens';

interface SkillChipProps {
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function SkillChip({ label, style }: SkillChipProps) {
  return (
    <View style={[styles.chip, style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.opt6,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.text.primary,
  },
});
