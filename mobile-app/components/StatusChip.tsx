/**
 * StatusChip — Unified status taxonomy for BharatPath.
 * Each chip communicates meaning through text AND visual styling.
 * Uses Space Mono for labels. Never relies on color alone.
 *
 * Taxonomy:
 *   MATCH     — Green: strong profile match
 *   SHORT    — Amber: shortlisted / 14-day window
 *   INTERVIEW — Indigo: interview stage
 *   SENT      — Neutral: application sent
 *   EXPIRING  — Red: deadline approaching
 *   PAID      — Gold: premium / paid status
 *   BAND      — Indigo: progress band (e.g. "BAND 1 OF 4")
 */
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '@/theme/tokens';

export type StatusChipType =
  | 'MATCH'
  | 'SHORT'
  | 'INTERVIEW'
  | 'SENT'
  | 'EXPIRING'
  | 'PAID'
  | 'BAND';

interface StatusChipProps {
  type: StatusChipType;
  label?: string;
  bandCurrent?: number;
  bandTotal?: number;
  style?: StyleProp<ViewStyle>;
}

interface ChipStyle {
  bg: string;
  fg: string;
  text: string;
  icon: string;
}

const chipStyles: Record<StatusChipType, ChipStyle> = {
  MATCH: {
    bg: Colors.green.bg,
    fg: Colors.green.fg,
    text: 'Match',
    icon: '✓',
  },
  SHORT: {
    bg: Colors.amber.bg,
    fg: Colors.amber.fg,
    text: '14-day shortlist',
    icon: '◐',
  },
  INTERVIEW: {
    bg: Colors.indigoSemantic.bg,
    fg: Colors.indigoSemantic.fg,
    text: 'Interview',
    icon: '◆',
  },
  SENT: {
    bg: Colors.surface.tint,
    fg: Colors.text.muted,
    text: 'Application sent',
    icon: '→',
  },
  EXPIRING: {
    bg: Colors.red.bg,
    fg: Colors.red.fg,
    text: 'Expiring soon',
    icon: '!',
  },
  PAID: {
    bg: '#F7EFD6',
    fg: Colors.goldDeep,
    text: 'Premium',
    icon: '★',
  },
  BAND: {
    bg: Colors.indigoSemantic.bg,
    fg: Colors.indigoSemantic.fg,
    text: 'Band',
    icon: '◐',
  },
};

export function StatusChip({ type, label, bandCurrent, bandTotal, style }: StatusChipProps) {
  const s = chipStyles[type];

  let displayText = label ?? s.text;
  if (type === 'BAND' && bandCurrent !== undefined && bandTotal !== undefined) {
    displayText = `BAND ${bandCurrent} OF ${bandTotal}`;
  }
  if (type === 'SHORT' && !label) {
    displayText = '14-day shortlist';
  }

  return (
    <View style={[styles.chip, { backgroundColor: s.bg }, style]}>
      <Text style={[styles.icon, { color: s.fg }]}>{s.icon}</Text>
      <Text style={[styles.label, { color: s.fg }]}>{displayText.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.opt6,
    paddingHorizontal: Spacing.opt10,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  icon: {
    ...Typography.monoEyebrow,
    fontSize: 10,
  },
  label: {
    ...Typography.chip,
  },
});
