/**
 * BharatPath — JobDetailShortScreen ("Job — short of the bar")
 * Exactly matches Screen 36 from BharatPath Handoff and Screenshot 4.
 * Features:
 * - Deep navy header with drift accents, back button, bookmark & share
 * - NF company badge, role title, verified badge
 * - "You are 14 points short" with -14 pill and score gap benchmark slider
 * - "ONE FIX CLOSES THE GAP" card with +20 badge and "Work on my score" button
 * - Monthly, Shift, Distance metric cards
 * - "WHAT YOU WOULD DO" overview
 * - Sticky CTA: "Tell me when I reach 720" with Bell icon
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
  Target,
  CurrencyInr,
  Clock,
  MapPin,
  Bell,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface JobDetailShortScreenProps {
  onBack?: () => void;
  onWorkOnScore?: () => void;
  onNotifyMe?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
}

export function JobDetailShortScreen({
  onBack,
  onWorkOnScore,
  onNotifyMe,
  onBookmark,
  onShare,
}: JobDetailShortScreenProps) {
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
                    Alert.alert('Job Saved', 'QC Assistant saved to your bookmarks.');
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
                    Alert.alert('Share Job', 'Sharing QC Assistant at Nivara Foods.');
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
                <Text style={styles.companyBadgeText}>NF</Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitleText}>QC Assistant</Text>
                <View style={styles.companySubRow}>
                  <Text style={styles.companyNameText}>Nivara Foods</Text>
                  <SealCheck size={14} color="#FFFCF7" weight="fill" />
                  <Text style={styles.verifiedLabelText}>Verified</Text>
                </View>
              </View>
            </View>

            {/* Score Gap Card */}
            <View style={styles.scoreGapCard}>
              <View style={styles.gapHeaderRow}>
                <Target size={18} color="#FFFCF7" weight="fill" />
                <Text style={styles.gapTitleText}>You are 14 points short</Text>
                <View style={styles.gapDeltaPill}>
                  <Text style={styles.gapDeltaText}>−14</Text>
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
                  <Text style={styles.sliderBarLabel}>BAR 720</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* White / Off-White Details Section */}
        <View style={styles.detailsBody}>
          {/* ONE FIX CLOSES THE GAP Card */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>ONE FIX CLOSES THE GAP</Text>
            <View style={styles.fixCard}>
              <View style={styles.fixTopRow}>
                <View style={styles.fixBadgePill}>
                  <Text style={styles.fixBadgeText}>+20</Text>
                </View>
                <Text style={styles.fixTitleText}>
                  Put a number on your final-year project
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.workOnScoreBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onWorkOnScore}
                accessibilityRole="button"
              >
                <Text style={styles.workOnScoreBtnText}>Work on my score</Text>
              </Pressable>
            </View>
          </View>

          {/* 3 Metric Cards */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <CurrencyInr size={17} color="#5E4DB2" weight="duotone" />
              <Text style={styles.metricLabel}>MONTHLY</Text>
              <Text style={styles.metricValueMono}>20–26k</Text>
            </View>

            <View style={styles.metricCard}>
              <Clock size={17} color="#5F6B80" weight="duotone" />
              <Text style={styles.metricLabel}>SHIFT</Text>
              <Text style={styles.metricValueSans}>Rotational</Text>
            </View>

            <View style={styles.metricCard}>
              <MapPin size={17} color="#5F6B80" weight="duotone" />
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricValueSans}>14 km</Text>
            </View>
          </View>

          {/* WHAT YOU WOULD DO */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>WHAT YOU WOULD DO</Text>
            <Text style={styles.bodyDescription}>
              Line sampling and batch checks at a packaged foods plant.
              Rotational shifts, with company transport from Hinjawadi.
            </Text>
          </View>

          {/* Sticky Bottom CTA */}
          <View style={styles.bottomCtaContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.notifyBtn,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                onNotifyMe?.();
                Alert.alert('Alert Set', 'We will notify you when your score reaches 720.');
              }}
              accessibilityRole="button"
            >
              <Bell size={16} color="#FFFFFF" weight="bold" />
              <Text style={styles.notifyBtnText}>Tell me when I reach 720</Text>
            </Pressable>
            <Text style={styles.applySubtext}>
              The employer set this bar, not us
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
  scoreGapCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.18)',
    gap: 14,
  },
  gapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gapTitleText: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  gapDeltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F4D685',
  },
  gapDeltaText: {
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
    left: '53%',
    transform: [{ translateX: -30 }],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
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
    width: '53%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 247, 0.62)',
  },
  barMarker: {
    position: 'absolute',
    left: '75%',
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
    width: '75%',
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
    color: '#FFFCF7',
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
  fixCard: {
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    marginTop: 4,
  },
  fixTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fixBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F7EFD6',
  },
  fixBadgeText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 16,
    color: '#7A5C0E',
  },
  fixTitleText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy,
  },
  workOnScoreBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.navy,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workOnScoreBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
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
  bodyDescription: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#3A4761',
  },
  bottomCtaContainer: {
    marginTop: 10,
    gap: 8,
  },
  notifyBtn: {
    width: '100%',
    backgroundColor: '#5F4DB2',
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notifyBtnText: {
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
