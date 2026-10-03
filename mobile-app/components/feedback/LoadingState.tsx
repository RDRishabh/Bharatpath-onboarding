/**
 * LoadingState - Centered spinner with optional message.
 * Uses indigo accent for the activity indicator.
 */
import { View, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '@/theme/tokens';

interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message = 'Loading…', style }: LoadingStateProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={Colors.indigo} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    padding: Spacing.xxl,
  },
  message: {
    ...Typography.body,
    color: Colors.text.muted,
  },
});
