/**
 * BottomTabBar — Floating navigation with translucent/blurred surface.
 * ~22px radius, system shadow, active = indigo tint + filled icon + stronger label.
 * Inactive = muted text + bold icon.
 *
 * Tabs: Home, Jobs, Board, You
 * Uses bold icons for navigation, fill icons for active state.
 */
import { Pressable, View, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { House, Briefcase, ClipboardText, UserCircle, Sparkle } from 'phosphor-react-native';
import { Colors, Typography, Radii, Spacing, Layout, Shadows } from '@/theme/tokens';
import type { IconWeight } from 'phosphor-react-native';

export type TabName = 'preview' | 'home' | 'jobs' | 'board' | 'you';

interface TabConfig {
  name: TabName;
  label: string;
  icon: typeof House;
  href: string;
}

const tabs: TabConfig[] = [
  { name: 'preview', label: 'Preview', icon: Sparkle, href: '/' },
  { name: 'home', label: 'Home', icon: House, href: '/home' },
  { name: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { name: 'board', label: 'Board', icon: ClipboardText, href: '/board' },
  { name: 'you', label: 'You', icon: UserCircle, href: '/you' },
];

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName, href: string) => void;
  style?: ViewStyle;
}

export function BottomTabBar({ activeTab, onTabPress, style }: BottomTabBarProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.barContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.bar}>
            {tabs.map((tab) => (
              <TabItem key={tab.name} tab={tab} isActive={activeTab === tab.name} onPress={onTabPress} />
            ))}
          </View>
        ) : (
          <BlurView intensity={60} tint="light" style={styles.blurBar}>
            {tabs.map((tab) => (
              <TabItem key={tab.name} tab={tab} isActive={activeTab === tab.name} onPress={onTabPress} />
            ))}
          </BlurView>
        )}
      </View>
    </View>
  );
}

interface TabItemProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: (tab: TabName, href: string) => void;
}

function TabItem({ tab, isActive, onPress }: TabItemProps) {
  const Icon = tab.icon;
  const iconColor = isActive ? Colors.nav.activeFg : Colors.nav.inactiveFg;
  const weight: IconWeight = isActive ? 'fill' : 'bold';

  return (
    <Pressable
      onPress={() => onPress(tab.name, tab.href)}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        <Icon size={22} color={iconColor} weight={weight} />
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Layout.bottomNavMarginBottom,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Layout.bottomNavMarginHorizontal,
  },
  barContainer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth - Layout.bottomNavMarginHorizontal * 2,
    ...Shadows.bottomNav,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 252, 247, 0.85)',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
  },
  blurBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    minHeight: Layout.minTouchTarget,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: Colors.nav.activeBg,
  },
  label: {
    ...Typography.tabLabel,
    color: Colors.nav.inactiveFg,
  },
  labelActive: {
    color: Colors.nav.activeFg,
    fontWeight: '600',
  },
});
