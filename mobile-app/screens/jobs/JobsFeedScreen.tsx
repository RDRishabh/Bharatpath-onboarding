/**
 * BharatPath — JobsFeedScreen ("Jobs" Tab Screen)
 * Exactly matches Screen 33 from BharatPath Handoff and Screenshot 1.
 * Features:
 * - Location header with filter button and gold badge dot
 * - 28 Matches score readiness banner with drift gradient
 * - Search bar with real-time text query input
 * - Horizontal filter chips (I qualify · 28, Lab & QC, Fresher, Day shift)
 * - Section header (NEW THIS WEEK · 6, Nearest first dropdown)
 * - 3 Job cards (Sterling Diagnostics, Nivara Foods, Brightline Retail)
 * - Filter bottom sheet integration
 * - Sticky bottom tab bar with "Jobs" active
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  MapPin,
  SlidersHorizontal,
  ArrowRight,
  MagnifyingGlass,
  CheckCircle,
  CaretDown,
  SealCheck,
  Clock,
  CaretRight,
  TrendUp,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';
import { BottomTabBar, TabName } from '@/components/navigation/BottomTabBar';
import { JobFiltersSheet } from '@/screens/jobs/JobFiltersSheet';

export interface JobsFeedScreenProps {
  activeTab?: TabName;
  onTabPress?: (tab: TabName, href: string) => void;
  onJobPress?: (jobId: string) => void;
  onScoreBannerPress?: () => void;
}

export function JobsFeedScreen({
  activeTab = 'jobs',
  onTabPress,
  onJobPress,
  onScoreBannerPress,
}: JobsFeedScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState('qualify');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.topRow}>
              <View style={styles.titleCol}>
                <Text style={styles.mainTitle}>Jobs</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color="#5F6B80" weight="bold" />
                  <Text style={styles.locationText}>Pune · within 15 km</Text>
                </View>
              </View>

              {/* Filter Button with Gold Dot Badge */}
              <Pressable
                style={({ pressed }) => [
                  styles.filterIconBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsFilterSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open job filters"
              >
                <SlidersHorizontal size={18} color={Colors.navy} weight="bold" />
                <View style={styles.goldBadgeDot} />
              </Pressable>
            </View>

            {/* Score Matches Banner */}
            <Pressable
              style={({ pressed }) => [
                styles.scoreBanner,
                pressed && styles.bannerPressed,
              ]}
              onPress={onScoreBannerPress}
              accessibilityRole="button"
            >
              <View style={styles.matchesCountCol}>
                <Text style={styles.matchesCountNumber}>28</Text>
                <Text style={styles.matchesCountLabel}>MATCHES</Text>
              </View>
              <View style={styles.bannerDivider} />
              <Text style={styles.bannerText}>
                Open to your score of{' '}
                <Text style={styles.bannerScoreHighlight}>706</Text>. Nine more
                unlock at 734.
              </Text>
              <ArrowRight size={15} color="#FFFFFF" weight="bold" />
            </Pressable>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <MagnifyingGlass size={16} color="#5F6B80" weight="bold" />
              <TextInput
                style={styles.searchInput}
                placeholder="Role, company or skill"
                placeholderTextColor="#566073"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Horizontal Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <Pressable
                style={[
                  styles.chipPill,
                  selectedChip === 'qualify'
                    ? styles.chipPillActive
                    : styles.chipPillInactive,
                ]}
                onPress={() => setSelectedChip('qualify')}
              >
                <CheckCircle size={13} color="#F4D685" weight="fill" />
                <Text
                  style={[
                    styles.chipText,
                    selectedChip === 'qualify' && styles.chipTextActive,
                  ]}
                >
                  I qualify · 28
                </Text>
              </Pressable>

              {['Lab & QC', 'Fresher', 'Day shift'].map((chip) => {
                const isActive = selectedChip === chip;
                return (
                  <Pressable
                    key={chip}
                    style={[
                      styles.chipPill,
                      isActive ? styles.chipPillActive : styles.chipPillInactive,
                    ]}
                    onPress={() => setSelectedChip(chip)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Section Eyebrow Row */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>NEW THIS WEEK · 6</Text>
            <View style={styles.sortDropdown}>
              <Text style={styles.sortDropdownText}>Nearest first</Text>
              <CaretDown size={11} color={Colors.navy} weight="bold" />
            </View>
          </View>

          {/* Job Cards List */}
          <View style={styles.jobList}>
            {/* Card 1: Sterling Diagnostics (MATCH) */}
            <Pressable
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onJobPress?.('sterling-diagnostics')}
              accessibilityRole="button"
            >
              <View style={styles.jobCardTop}>
                <View style={styles.badgeNavy}>
                  <Text style={styles.badgeNavyText}>SD</Text>
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>Lab Analyst Trainee</Text>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyName}>Sterling Diagnostics</Text>
                    <SealCheck size={13} color="#1F6B45" weight="fill" />
                  </View>
                </View>
                <View style={styles.tagMatch}>
                  <CheckCircle size={12} color="#1F6B45" weight="fill" />
                  <Text style={styles.tagMatchText}>MATCH</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.salaryText}>₹18k–24k</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Kothrud · 6 km</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Needs 680</Text>
              </View>

              <View style={styles.jobCardFooter}>
                <Clock size={14} color="#5F6B80" weight="bold" />
                <Text style={styles.footerPostedText}>
                  Posted 2 days ago · 11 applied
                </Text>
                <CaretRight size={13} color="#5F6B80" weight="bold" />
              </View>
            </Pressable>

            {/* Card 2: Nivara Foods (14 SHORT) */}
            <Pressable
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onJobPress?.('nivara-foods')}
              accessibilityRole="button"
            >
              <View style={styles.jobCardTop}>
                <View style={styles.badgePurple}>
                  <Text style={styles.badgePurpleText}>NF</Text>
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>QC Assistant</Text>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyName}>Nivara Foods</Text>
                    <SealCheck size={13} color="#1F6B45" weight="fill" />
                  </View>
                </View>
                <View style={styles.tagShort}>
                  <Text style={styles.tagShortText}>14 SHORT</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.salaryText}>₹20k–26k</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Hinjawadi · 14 km</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Needs 720</Text>
              </View>

              <View style={styles.jobCardFooter}>
                <TrendUp size={14} color="#B9891A" weight="bold" />
                <Text style={styles.footerImprovementText}>
                  Two fixes on your resume would open this one
                </Text>
              </View>
            </Pressable>

            {/* Card 3: Brightline Retail (MATCH) */}
            <Pressable
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onJobPress?.('brightline-retail')}
              accessibilityRole="button"
            >
              <View style={styles.jobCardTop}>
                <View style={styles.badgeYellow}>
                  <Text style={styles.badgeYellowText}>BL</Text>
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>Field Sales Associate</Text>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyName}>Brightline Retail</Text>
                    <SealCheck size={13} color="#1F6B45" weight="fill" />
                  </View>
                </View>
                <View style={styles.tagMatch}>
                  <CheckCircle size={12} color="#1F6B45" weight="fill" />
                  <Text style={styles.tagMatchText}>MATCH</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.salaryText}>₹15k–22k</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Baner · 9 km</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>Needs 680</Text>
              </View>

              <View style={styles.jobCardFooter}>
                <Clock size={14} color="#5F6B80" weight="bold" />
                <Text style={styles.footerPostedText}>
                  Posted 5 days ago · 4 applied
                </Text>
                <CaretRight size={13} color="#5F6B80" weight="bold" />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Filter Bottom Sheet */}
      <JobFiltersSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        matchCount={28}
      />

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
    gap: 16,
  },
  headerSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  mainTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: Colors.navy,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  filterIconBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E0D4',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37', // Brand gold dot
    borderWidth: 1.5,
    borderColor: '#FFFCF7',
  },
  scoreBanner: {
    backgroundColor: Colors.navy,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  matchesCountCol: {
    gap: 2,
  },
  matchesCountNumber: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },
  matchesCountLabel: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.4,
    color: '#9DA9BE',
  },
  bannerDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 252, 247, 0.16)',
  },
  bannerText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#9DA9BE',
  },
  bannerScoreHighlight: {
    color: '#F4D685',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
    padding: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipPillActive: {
    backgroundColor: Colors.navy,
  },
  chipPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
  },
  chipText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.navy,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderTitle: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDropdownText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.navy,
  },
  jobList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  jobCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgeNavy: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNavyText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#F4D685',
  },
  badgePurple: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1EAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePurpleText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#4A3E8F',
  },
  badgeYellow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F7EFD6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeYellowText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#7A5C0E',
  },
  jobInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  jobTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: Colors.navy,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyName: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  tagMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E6F1EA',
  },
  tagMatchText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#1F6B45',
    fontWeight: '700',
  },
  tagShort: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7EFD6',
  },
  tagShortText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#7A5C0E',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  salaryText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B5AC96',
  },
  metaText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBDF',
  },
  footerPostedText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  footerImprovementText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#7A5C0E',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  bannerPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
});
