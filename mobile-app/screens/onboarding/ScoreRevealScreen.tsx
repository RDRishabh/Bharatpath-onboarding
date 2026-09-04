import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ShareNetwork, ArrowRight } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface ScoreRevealScreenProps {
  score?: number;
  onSave?: () => void;
  onRaiseScore?: () => void;
  onAllCategories?: () => void;
}

export function ScoreRevealScreen({
  score = 680,
  onSave,
  onRaiseScore,
  onAllCategories,
}: ScoreRevealScreenProps) {
  const [scoreNow, setScoreNow] = useState(540);

  // Count-up animation from 540 to target score
  useEffect(() => {
    let current = 540;
    const interval = setInterval(() => {
      current += Math.max(2, Math.round((score - current) / 5));
      if (current >= score) {
        current = score;
        clearInterval(interval);
      }
      setScoreNow(current);
    }, 32);

    return () => clearInterval(interval);
  }, [score]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" animated />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Dark Section */}
          <View style={styles.topSection}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleCol}>
                <Text style={styles.title}>Your resume score</Text>
                <Text style={styles.subtitle}>Every fix moves you up.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <ShareNetwork size={16} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            {/* Circular Gauge Ring Display */}
            <View style={styles.gaugeContainer}>
              {/* Radial glow background effect */}
              <View style={styles.radialGlow} />

              <Svg width={190} height={190} viewBox="0 0 120 120" style={styles.svgRing}>
                <Defs>
                  <LinearGradient id="scoreArcGradient" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#FFF6DC" />
                    <Stop offset="52%" stopColor="#F4D685" />
                    <Stop offset="100%" stopColor="#D4AF37" />
                  </LinearGradient>
                </Defs>

                {/* Track Circle */}
                <SvgCircle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(255, 252, 247, 0.12)"
                  strokeWidth="10"
                />

                {/* Animated Score Arc Circle */}
                <SvgCircle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#scoreArcGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="326.7"
                  strokeDashoffset="95"
                />
              </Svg>

              <View style={styles.gaugeCenterContent}>
                <Text style={styles.scoreNumberText}>{scoreNow}</Text>
                <Text style={styles.outOfText}>OUT OF 999</Text>
              </View>
            </View>

            {/* Band Status Section */}
            <View style={styles.bandStatusSection}>
              <View style={styles.bandTitleRow}>
                <Text style={styles.bandTitle}>Emerging</Text>
                <View style={styles.bandBadge}>
                  <Text style={styles.bandBadgeText}>BAND 1 OF 4</Text>
                </View>
              </View>

              {/* 4-segment progress bar */}
              <View style={styles.bandSegmentsRow}>
                <View style={[styles.bandSegment, styles.segmentActiveGold]} />
                <View style={[styles.bandSegment, styles.segmentInactiveDark]} />
                <View style={[styles.bandSegment, styles.segmentInactiveDark]} />
                <View style={[styles.bandSegment, styles.segmentInactiveDark]} />
              </View>

              <View style={styles.bandMetaRow}>
                <Text style={styles.bandMetaLeft}>Employers filter by band</Text>
                <Text style={styles.bandMetaRight}>54 to Building</Text>
              </View>
            </View>
          </View>

          {/* Bottom Overlapping White Card Sheet */}
          <View style={styles.whiteSheet}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetEyebrow}>WHERE YOUR POINTS COME FROM</Text>
              <Text style={styles.sheetCountText}>3 OF 5</Text>
            </View>

            {/* Score Breakdown Card */}
            <View style={styles.breakdownCard}>
              {/* Item 1: Education */}
              <View style={styles.breakdownItem}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemLabelRow}>
                    <Text style={styles.itemCategoryTitle}>Education</Text>
                    <View style={[styles.statusBadge, styles.badgeStrong]}>
                      <Text style={[styles.statusBadgeText, styles.badgeTextStrong]}>
                        STRONG
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemScoreText}>
                    72 <Text style={styles.itemScoreMax}>/ 100</Text>
                  </Text>
                </View>
                <View style={styles.itemProgressTrack}>
                  <View style={[styles.itemProgressFill, styles.fillGreen, { width: '72%' }]} />
                </View>
              </View>

              {/* Item 2: Skills */}
              <View style={[styles.breakdownItem, styles.itemBorderTop]}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemLabelRow}>
                    <Text style={styles.itemCategoryTitle}>Skills</Text>
                    <View style={[styles.statusBadge, styles.badgeNeedsWork]}>
                      <Text style={[styles.statusBadgeText, styles.badgeTextNeedsWork]}>
                        NEEDS WORK
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemScoreText}>
                    48 <Text style={styles.itemScoreMax}>/ 100</Text>
                  </Text>
                </View>
                <View style={styles.itemProgressTrack}>
                  <View style={[styles.itemProgressFill, styles.fillAmber, { width: '48%' }]} />
                </View>
              </View>

              {/* Item 3: Experience */}
              <View style={[styles.breakdownItem, styles.itemBorderTop]}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemLabelRow}>
                    <Text style={styles.itemCategoryTitle}>Experience</Text>
                    <View style={[styles.statusBadge, styles.badgeWeak]}>
                      <Text style={[styles.statusBadgeText, styles.badgeTextWeak]}>
                        WEAK
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemScoreText}>
                    15 <Text style={styles.itemScoreMax}>/ 100</Text>
                  </Text>
                </View>
                <View style={styles.itemProgressTrack}>
                  <View style={[styles.itemProgressFill, styles.fillRed, { width: '15%' }]} />
                </View>
              </View>

              {/* Footer Button: All five categories */}
              <Pressable
                style={({ pressed }) => [
                  styles.allCategoriesButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onAllCategories}
              >
                <Text style={styles.allCategoriesText}>All five categories</Text>
                <ArrowRight size={15} color="#5F6B80" weight="bold" />
              </Pressable>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.raiseScoreButton,
                  pressed && styles.raisePressed,
                ]}
                onPress={onRaiseScore}
              >
                <Text style={styles.raiseScoreButtonText}>Raise my score</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navy, // #0A1931
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    paddingHorizontal: Spacing.lg, // 20px
    paddingTop: Spacing.xl, // 24px
    paddingBottom: Spacing.xl, // 24px
    alignItems: 'center',
    gap: Spacing.lg, // 20px
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.md,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.26)',
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeContainer: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.xs,
  },
  radialGlow: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(244, 214, 133, 0.15)',
  },
  svgRing: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  gaugeCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scoreNumberText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  outOfText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  bandStatusSection: {
    width: '100%',
    gap: 10,
  },
  bandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bandTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.7,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill, // 999
    backgroundColor: 'rgba(244, 214, 133, 0.16)',
  },
  bandBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.0,
    color: '#F4D685',
    fontWeight: '700',
  },
  bandSegmentsRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  bandSegment: {
    flex: 1,
    height: 5,
    borderRadius: Radii.pill,
  },
  segmentActiveGold: {
    backgroundColor: '#F4D685',
  },
  segmentInactiveDark: {
    backgroundColor: 'rgba(255, 252, 247, 0.16)',
  },
  bandMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
  },
  bandMetaLeft: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  bandMetaRight: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#F4D685',
    fontWeight: '500',
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: Colors.offWhite, // #FFFCF7
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, // 20px
    paddingTop: Spacing.lg, // 20px
    paddingBottom: Spacing.xxl, // 40px
    gap: Spacing.md, // 12px
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sheetEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    color: '#5F6B80',
    fontWeight: '700',
  },
  sheetCountText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    lineHeight: 14,
    color: '#5F6B80',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    paddingHorizontal: Spacing.base, // 16px
  },
  breakdownItem: {
    paddingVertical: 12,
    gap: 10,
  },
  itemBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F0EBDF',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 8px
  },
  itemCategoryTitle: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy, // #0A1931
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeStrong: {
    backgroundColor: '#E6F1EA',
  },
  badgeTextStrong: {
    color: '#1F6B45',
  },
  badgeNeedsWork: {
    backgroundColor: '#F7EFD6',
  },
  badgeTextNeedsWork: {
    color: '#7A5C0E',
  },
  badgeWeak: {
    backgroundColor: '#F8E6E0',
  },
  badgeTextWeak: {
    color: '#993A22',
  },
  statusBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.0,
    fontWeight: '700',
  },
  itemScoreText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy, // #0A1931
    fontWeight: '700',
  },
  itemScoreMax: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
    fontWeight: '400',
  },
  itemProgressTrack: {
    height: 4,
    borderRadius: Radii.pill,
    backgroundColor: '#F0EBDF',
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  fillGreen: {
    backgroundColor: '#1F6B45',
  },
  fillAmber: {
    backgroundColor: '#B9891A',
  },
  fillRed: {
    backgroundColor: '#993A22',
  },
  allCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBDF',
  },
  allCategoriesText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy, // #0A1931
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm, // 8px
    paddingTop: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 16,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
    fontWeight: '600',
  },
  raiseScoreButton: {
    flex: 1.5,
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  raisePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  raiseScoreButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.offWhite,
    fontWeight: '600',
  },
});
