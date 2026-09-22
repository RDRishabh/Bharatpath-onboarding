/**
 * CompanyMonogram — Circular brand monogram with initials.
 * Uses deterministic navy/indigo background selection.
 */
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Radii } from '@/theme/tokens';
import { pickFromString } from '@/utils/helpers';

interface CompanyMonogramProps {
  name: string;
  initials?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const bgOptions = [Colors.navy, Colors.indigo];

export function CompanyMonogram({ name, initials, size = 44, style }: CompanyMonogramProps) {
  const bg = pickFromString(name, bgOptions);
  const displayInitials = initials ?? name.slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        styles.monogram,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{displayInitials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    ...Typography.monoNumber,
    color: Colors.offWhite,
    fontWeight: '700',
  },
});
