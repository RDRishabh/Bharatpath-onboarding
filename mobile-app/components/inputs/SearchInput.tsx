/**
 * SearchInput - Rounded input with magnifying glass icon, 16px radius.
 * Accessible label, minimum 44px height.
 */
import { TextInput, View, StyleSheet, ViewStyle } from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';
import { Colors, Typography, Radii, Spacing, Layout } from '@/theme/tokens';

interface SearchInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search jobs, companies, skills',
  onSubmitEditing,
  style,
  accessibilityLabel = 'Search',
}: SearchInputProps) {
  return (
    <View style={[styles.container, style]}>
      <MagnifyingGlass size={20} color={Colors.text.muted} weight="bold" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.base,
    minHeight: Layout.minTouchTarget,
  },
  input: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
    paddingVertical: Spacing.opt10,
  },
});
