/**
 * TopBar — Screen header with optional back button, title, and right action.
 * Translucent off-white surface with border hairline at the bottom.
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BackButton } from '@/components/buttons/BackButton';
import { Colors, Typography, Spacing } from '@/theme/tokens';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode;
  variant?: 'default' | 'navy';
  style?: StyleProp<ViewStyle>;
}

export function TopBar({ title, showBack = false, onBackPress, rightAction, variant = 'default', style }: TopBarProps) {
  const isNavy = variant === 'navy';
  return (
    <View style={[styles.container, isNavy && styles.containerNavy, style]}>
      {showBack && (
        <BackButton
          onPress={onBackPress}
          variant={isNavy ? 'navy' : 'default'}
          color={isNavy ? Colors.offWhite : Colors.navy}
        />
      )}
      {title && (
        <Text style={[styles.title, isNavy && styles.titleOnNavy]} numberOfLines={1}>
          {title}
        </Text>
      )}
      <View style={styles.rightAction}>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingVertical: Spacing.sm,
  },
  containerNavy: {
    backgroundColor: Colors.navy,
  },
  title: {
    ...Typography.cardTitle,
    flex: 1,
    color: Colors.navy,
  },
  titleOnNavy: {
    color: Colors.offWhite,
  },
  rightAction: {
    marginLeft: 'auto',
  },
});
