/**
 * ScoreDisplay — Large computed score with Space Mono.
 * Shows current / max format, optional delta, gold accent for earned.
 */
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '@/theme/tokens';

interface ScoreDisplayProps {
  current: number;
  max: number;
  label?: string;
  delta?: string;
  variant?: 'default' | 'onNavy';
  style?: StyleProp<ViewStyle>;
}

export function ScoreDisplay({
  current,
  max,
  label,
  delta,
  variant = 'default',
  style,
}: ScoreDisplayProps) {
  const isOnNavy = variant === 'onNavy';
  const labelColor = isOnNavy ? Colors.text.mutedOnNavy : Colors.text.muted;
  const deltaColor = isOnNavy ? Colors.gold : Colors.goldDeep;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: labelColor }]}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={styles.scoreRow}>
        <Text style={[styles.score, isOnNavy && styles.scoreOnNavy]}>{current}</Text>
        <Text style={[styles.scoreMax, { color: isOnNavy ? Colors.text.mutedOnNavy : Colors.text.muted }]}>
          / {max}
        </Text>
      </View>
      {delta && (
        <Text style={[styles.delta, { color: deltaColor }]}>{delta}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  label: {
    ...Typography.monoEyebrow,
    marginBottom: Spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  score: {
    ...Typography.displayScore,
    color: Colors.navy,
  },
  scoreOnNavy: {
    color: Colors.offWhite,
  },
  scoreMax: {
    ...Typography.monoNumber,
    fontSize: 20,
  },
  delta: {
    ...Typography.monoMeta,
    marginTop: Spacing.xs,
  },
});
