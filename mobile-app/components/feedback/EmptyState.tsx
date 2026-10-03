/**
 * EmptyState - Centered icon, title, and optional subtitle/action.
 * Uses duotone Phosphor icon for information context.
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '@/theme/tokens';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, subtitle, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconWell}>
          {icon}
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xxl,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: Radii.iconWellLg,
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.cardTitle,
    color: Colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  actionContainer: {
    marginTop: Spacing.base,
  },
});
