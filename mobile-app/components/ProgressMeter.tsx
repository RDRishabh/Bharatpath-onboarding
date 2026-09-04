/**
 * ProgressMeter — Horizontal progress bar with indigo fill.
 * Supports discrete steps (band mode) or continuous percentage.
 */
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface ProgressMeterProps {
  /** 0–100 for continuous mode */
  percent?: number;
  /** Discrete step mode */
  steps?: { label: string; completed: boolean }[];
  style?: StyleProp<ViewStyle>;
  height?: number;
}

export function ProgressMeter({ percent, steps, style, height = 8 }: ProgressMeterProps) {
  if (steps && steps.length > 0) {
    const completedCount = steps.filter((s) => s.completed).length;
    const pct = (completedCount / steps.length) * 100;
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.track, { height }]}>
          <View style={[styles.fill, { width: `${pct}%`, height }]} />
        </View>
        <View style={styles.stepsRow}>
          {steps.map((step, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                step.completed && styles.stepDotCompleted,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  const pct = Math.min(Math.max(percent ?? 0, 0), 100);
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${pct}%`, height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    backgroundColor: Colors.surface.hairline,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: Colors.indigo,
    borderRadius: Radii.pill,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    backgroundColor: Colors.offWhite,
  },
  stepDotCompleted: {
    backgroundColor: Colors.indigo,
    borderColor: Colors.indigo,
  },
});
