/**
 * BharatPath — ProfileScreen ("You" Screen)
 * Exactly matches Screen 40 from BharatPath Handoff and Screenshot 1.
 * Features:
 * - Candidate PD badge, Name & phone/city
 * - 3 summary stat cards: Score (706, dark theme), Applied (6), Add-ons (2)
 * - MY INFORMATION section (Resume details, Attribute report, Interview report, Language)
 * - PRIVACY AND DATA section (Who has seen me [badge 3], Download my data [Working], Delete my account)
 * - Sticky bottom tab bar with "You" tab active
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  UserCircle,
  LockKey,
  CaretRight,
  FileText,
  Compass,
  MicrophoneStage,
  Translate,
  Eye,
  DownloadSimple,
  Trash,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';
import { BottomTabBar, TabName } from '@/components/navigation/BottomTabBar';

export interface ProfileScreenProps {
  name?: string;
  initials?: string;
  phoneAndCity?: string;
  score?: number;
  appliedCount?: number;
  addonsCount?: number;
  activeTab?: TabName;
  onTabPress?: (tab: TabName, href: string) => void;
  onScorePress?: () => void;
  onAppliedPress?: () => void;
  onAddonsPress?: () => void;
  onResumeDetailsPress?: () => void;
  onAttributeReportPress?: () => void;
  onInterviewReportPress?: () => void;
  onLanguagePress?: () => void;
  onWhoHasSeenMePress?: () => void;
  onDownloadDataPress?: () => void;
  onDeleteAccountPress?: () => void;
}

export function ProfileScreen({
  name = 'Priya Deshmukh',
  initials = 'PD',
  phoneAndCity = '+91 98••• ••42 · Pune',
  score = 706,
  appliedCount = 6,
  addonsCount = 2,
  activeTab = 'you',
  onTabPress,
  onScorePress,
  onAppliedPress,
  onAddonsPress,
  onResumeDetailsPress,
  onAttributeReportPress,
  onInterviewReportPress,
  onLanguagePress,
  onWhoHasSeenMePress,
  onDownloadDataPress,
  onDeleteAccountPress,
}: ProfileScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with PD avatar badge and candidate info */}
          <View style={styles.header}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userSub}>{phoneAndCity}</Text>
            </View>
          </View>

          {/* 3 Stat Cards: Score, Applied, Add-ons */}
          <View style={styles.statsRow}>
            {/* Dark Score Card */}
            <Pressable
              style={({ pressed }) => [
                styles.statCardDark,
                pressed && styles.cardPressed,
              ]}
              onPress={onScorePress}
              accessibilityRole="button"
            >
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabelDark}>Score</Text>
                <CaretRight size={11} color="rgba(255,252,247,0.6)" weight="bold" />
              </View>
              <Text style={styles.statValueDark}>{score}</Text>
            </Pressable>

            {/* Applied Card */}
            <Pressable
              style={({ pressed }) => [
                styles.statCardLight,
                pressed && styles.cardPressed,
              ]}
              onPress={onAppliedPress}
              accessibilityRole="button"
            >
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabelLight}>Applied</Text>
                <CaretRight size={11} color="#6E7889" weight="bold" />
              </View>
              <Text style={styles.statValueLight}>{appliedCount}</Text>
            </Pressable>

            {/* Add-ons Card */}
            <Pressable
              style={({ pressed }) => [
                styles.statCardLight,
                pressed && styles.cardPressed,
              ]}
              onPress={onAddonsPress}
              accessibilityRole="button"
            >
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabelLight}>Add-ons</Text>
                <CaretRight size={11} color="#6E7889" weight="bold" />
              </View>
              <Text style={styles.statValueLight}>{addonsCount}</Text>
            </Pressable>
          </View>

          {/* Section: MY INFORMATION */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionEyebrow}>
              <UserCircle size={12} color="#A87C17" weight="bold" />
              <Text style={styles.sectionEyebrowText}>MY INFORMATION</Text>
            </View>

            {/* Resume details */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onResumeDetailsPress}
              accessibilityRole="button"
            >
              <FileText size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.menuItemTitle}>Resume details</Text>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>

            {/* Attribute report */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onAttributeReportPress}
              accessibilityRole="button"
            >
              <Compass size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.menuItemTitle}>Attribute report</Text>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>

            {/* Interview report */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onInterviewReportPress}
              accessibilityRole="button"
            >
              <MicrophoneStage size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.menuItemTitle}>Interview report</Text>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>

            {/* Language */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onLanguagePress}
              accessibilityRole="button"
            >
              <Translate size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.menuItemTitle}>Language</Text>
              <Text style={styles.menuItemSubText}>English</Text>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>
          </View>

          {/* Section: PRIVACY AND DATA */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionEyebrow}>
              <LockKey size={12} color="#A87C17" weight="bold" />
              <Text style={styles.sectionEyebrowText}>PRIVACY AND DATA</Text>
            </View>

            {/* Who has seen me */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onWhoHasSeenMePress}
              accessibilityRole="button"
            >
              <Eye size={20} color={Colors.indigo} weight="duotone" />
              <Text style={styles.menuItemTitle}>Who has seen me</Text>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>3</Text>
              </View>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>

            {/* Download my data */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onDownloadDataPress}
              accessibilityRole="button"
            >
              <DownloadSimple size={20} color="#3A4761" weight="duotone" />
              <View style={styles.menuItemColumn}>
                <Text style={styles.menuItemTitle}>Download my data</Text>
                <Text style={styles.menuItemDate}>Asked 8 Aug · ready by 15 Aug</Text>
              </View>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>Working</Text>
              </View>
            </Pressable>

            {/* Delete my account */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.cardPressed,
              ]}
              onPress={onDeleteAccountPress}
              accessibilityRole="button"
            >
              <Trash size={20} color="#3A4761" weight="duotone" />
              <Text style={styles.menuItemTitle}>Delete my account</Text>
              <CaretRight size={16} color="#5F6B80" weight="bold" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Floating Bottom Tab Bar */}
      {onTabPress && (
        <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFCF7', // Matches brand offWhite canvas
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: 110, // Space for floating bottom tab bar
    gap: 20,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy, // #0A1931
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 19,
    lineHeight: 24,
    color: '#D4AF37', // Brand gold
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 21,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: Colors.navy,
    fontWeight: '700',
  },
  userSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  statsRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 8,
  },
  statCardDark: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.navy,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    minHeight: 70,
  },
  statCardLight: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    minHeight: 70,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statLabelDark: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,252,247,0.6)',
  },
  statValueDark: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statLabelLight: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: '#5F6B80',
  },
  statValueLight: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    lineHeight: 24,
    color: Colors.navy,
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sectionEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 4,
  },
  sectionEyebrowText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: '#5F6B80',
  },
  menuItem: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
    fontWeight: '600',
  },
  menuItemSubText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
    marginRight: 4,
  },
  menuItemColumn: {
    flex: 1,
    gap: 2,
  },
  menuItemDate: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4AF37', // Brand gold border
  },
  badgePillText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
