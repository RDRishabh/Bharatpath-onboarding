/**
 * BharatPath — JobDetailQualifiedScreen
 * Exactly matches Screen 35 from BharatPath Handoff and Screenshot 2.
 * Features:
 * - Deep navy header with drift accents, back button, bookmark & share
 * - SD company badge, role title, verified badge
 * - "You clear the bar for this job" with +26 pill and score benchmark slider
 * - Monthly, Shift, Distance metric cards
 * - "WHAT YOU WOULD DO" overview
 * - "SKILLS THEY ASKED FOR" with verified checkmarks and missing dashed pill
 * - Privacy lock notice (EyeSlash)
 * - Sticky CTA: "Apply with my profile" (one tap, no forms)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookmarkSimple,
  ShareNetwork,
  SealCheck,
  CheckCircle,
  CurrencyInr,
  Clock,
  MapPin,
  Check,
  Plus,
  EyeSlash,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface JobDetailQualifiedScreenProps {
  onBack?: () => void;
  onApply?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
}

export function JobDetailQualifiedScreen({
  onBack,
  onApply,
  onBookmark,
  onShare,
}: JobDetailQualifiedScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" animated />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dark Navy Hero Section */}
        <View style={styles.navyHero}>
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            {/* Top Bar Actions */}
            <View style={styles.topNavRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.navCircleBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to jobs"
              >
                <ArrowLeft size={16} color="#FFFFFF" weight="bold" />
              </Pressable>

              <View style={styles.navRightActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.navCircleBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    onBookmark?.();
                    Alert.alert('Job Saved', 'Lab Analyst Trainee saved to your bookmarks.');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Save job"
                >
                  <BookmarkSimple size={17} color="#FFFFFF" weight="bold" />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.navCircleBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    onShare?.();
                    Alert.alert('Share Job', 'Sharing Lab Analyst Trainee at Sterling Diagnostics.');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Share job"
                >
                  <ShareNetwork size={17} color="#FFFFFF" weight="bold" />
                </Pressable>
              </View>
            </View>

            {/* Role & Company Header */}
            <View style={styles.roleHeaderRow}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>SD</Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitleText}>Lab Analyst Trainee</Text>
                <View style={styles.companySubRow}>
                  <Text style={styles.companyNameText}>Sterling Diagnostics</Text>
                  <SealCheck size={14} color="#FFFCF7" weight="fill" />
                  <Text style={styles.verifiedLabelText}>Verified</Text>
                </View>
              </View>
            </View>

            {/* Score Clearance Card */}
            <View style={styles.scoreClearanceCard}>
              <View style={styles.clearanceHeaderRow}>
                <View style={styles.clearanceCheckCircle}>
                  <Check size={8} color="#5F4DB2" weight="bold" />
                </View>
                <Text style={styles.clearanceTitleText}>
                  You clear the bar for this job
                </Text>
                <View style={styles.clearanceDeltaPill}>
                  <Text style={styles.clearanceDeltaText}>+26</Text>
                </View>
              </View>

              {/* Benchmark Slider */}
              <View style={styles.benchmarkSliderBox}>
                <View style={styles.userScorePill}>
                  <Text style={styles.userScorePillText}>YOU 706</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={styles.sliderFill} />
                  <View style={styles.barMarker} />
                </View>
                <View style={styles.sliderLabelsRow}>
                  <Text style={styles.sliderMinLabel}>600</Text>
                  <Text style={styles.sliderBarLabel}>THEIR BAR 680</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* White / Off-White Details Section */}
        <View style={styles.detailsBody}>
          {/* 3 Metric Cards */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <CurrencyInr size={17} color="#5E4DB2" weight="duotone" />
              <Text style={styles.metricLabel}>MONTHLY</Text>
              <Text style={styles.metricValueMono}>18–24k</Text>
            </View>

            <View style={styles.metricCard}>
              <Clock size={17} color="#5F6B80" weight="duotone" />
              <Text style={styles.metricLabel}>SHIFT</Text>
              <Text style={styles.metricValueSans}>Day</Text>
            </View>

            <View style={styles.metricCard}>
              <MapPin size={17} color="#5F6B80" weight="duotone" />
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricValueSans}>6 km</Text>
            </View>
          </View>

          {/* WHAT YOU WOULD DO */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>WHAT YOU WOULD DO</Text>
            <Text style={styles.bodyDescription}>
              Run routine sample tests, log results in the lab system, and keep
              the sample register clean. Six weeks of training to start. Team of
              nine.
            </Text>
          </View>

          {/* SKILLS THEY ASKED FOR */}
          <View style={styles.sectionBlock}>
            <View style={styles.skillsEyebrowRow}>
              <Text style={styles.sectionEyebrow}>SKILLS THEY ASKED FOR</Text>
              <Text style={styles.skillsCountText}>3 OF 4</Text>
            </View>

            <View style={styles.skillsChipsWrap}>
              <View style={styles.skillChipMatched}>
                <Check size={12} color="#1F6B45" weight="bold" />
                <Text style={styles.skillChipMatchedText}>Lab reporting</Text>
              </View>

              <View style={styles.skillChipMatched}>
                <Check size={12} color="#1F6B45" weight="bold" />
                <Text style={styles.skillChipMatchedText}>Microbial culturing</Text>
              </View>

              <View style={styles.skillChipMatched}>
                <Check size={12} color="#1F6B45" weight="bold" />
                <Text style={styles.skillChipMatchedText}>LIMS entry</Text>
              </View>

              <View style={styles.skillChipMissing}>
                <Plus size={11} color="#5F6B80" weight="bold" />
                <Text style={styles.skillChipMissingText}>Hindi typing</Text>
              </View>
            </View>
          </View>

          {/* Privacy Protection Notice */}
          <View style={styles.privacyNoticeBox}>
            <EyeSlash size={17} color="#5F6B80" weight="bold" />
            <Text style={styles.privacyNoticeText}>
              Your name and number stay hidden until this employer unlocks your
              profile. You get told when they do.
            </Text>
          </View>

          {/* Sticky Bottom CTA */}
          <View style={styles.bottomCtaContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && styles.buttonPressed,
              ]}
              onPress={onApply}
              accessibilityRole="button"
            >
              <Text style={styles.applyBtnText}>Apply with my profile</Text>
            </Pressable>
            <Text style={styles.applySubtext}>
              One tap · no forms, no cover letter
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  navyHero: {
    backgroundColor: '#5F4DB2',
    paddingBottom: 28,
  },
  heroSafeArea: {
    paddingHorizontal: 20,
    gap: 18,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.26)',
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  companyBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 252, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 17,
    lineHeight: 20,
    color: '#FFFCF7',
  },
  roleInfo: {
    flex: 1,
    gap: 4,
  },
  roleTitleText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  companySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyNameText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#9DA9BE',
  },
  verifiedLabelText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#9DA9BE',
  },
  scoreClearanceCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.18)',
    gap: 14,
  },
  clearanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearanceCheckCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFCF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearanceTitleText: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  clearanceDeltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F4D685',
  },
  clearanceDeltaText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: '#0A1931',
    fontWeight: '700',
  },
  benchmarkSliderBox: {
    position: 'relative',
    paddingTop: 22,
  },
  userScorePill: {
    position: 'absolute',
    top: 0,
    left: '66%',
    transform: [{ translateX: -30 }],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFCF7',
  },
  userScorePillText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#0A1931',
    fontWeight: '700',
  },
  sliderTrack: {
    position: 'relative',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 247, 0.16)',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '66%',
    borderRadius: 999,
    backgroundColor: '#FFFCF7',
  },
  barMarker: {
    position: 'absolute',
    left: '50%',
    top: -4,
    bottom: -4,
    width: 2,
    borderRadius: 2,
    backgroundColor: '#FFFCF7',
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  sliderMinLabel: {
    width: '50%',
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#9DA9BE',
  },
  sliderBarLabel: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  detailsBody: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 36,
    gap: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: '#5F6B80',
  },
  metricValueMono: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy,
  },
  metricValueSans: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionEyebrow: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    color: '#5F6B80',
    fontWeight: '700',
  },
  bodyDescription: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#3A4761',
  },
  skillsEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  skillsCountText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 14,
    color: '#5F6B80',
  },
  skillsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillChipMatched: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E6F1EA',
  },
  skillChipMatchedText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#1F6B45',
  },
  skillChipMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F7EFD6',
  },
  skillChipMissingText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#0A1931',
  },
  privacyNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#F7EFD6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  privacyNoticeText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#3A4761',
  },
  bottomCtaContainer: {
    marginTop: 10,
    gap: 8,
  },
  applyBtn: {
    width: '100%',
    backgroundColor: '#5F4DB2',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  applySubtext: {
    textAlign: 'center',
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
