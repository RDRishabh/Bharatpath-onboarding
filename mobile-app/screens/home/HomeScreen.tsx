import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ArrowRight,
  TrendUp,
  RocketLaunch,
  Briefcase,
  CaretRight,
  CheckCircle,
} from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { BottomTabBar, TabName } from '@/components/navigation/BottomTabBar';

export interface HomeScreenProps {
  candidateName?: string;
  candidateInitials?: string;
  currentDate?: string;
  score?: number;
  maxScore?: number;
  bandName?: string;
  bandNumber?: number;
  bandTotal?: number;
  scoreGain?: number;
  fixesLeft?: number;
  fixesWorth?: number;
  pointsToNextBand?: number;
  nextBandName?: string;
  activeTab?: TabName;
  onTabPress?: (tab: TabName, href: string) => void;
  onExploreJobs?: () => void;
  onScorePress?: () => void;
  onAttributeCheckPress?: () => void;
  onMockInterviewPress?: () => void;
  onAllJobsPress?: () => void;
  onJobPress?: (jobId: string) => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
}

export function HomeScreen({
  candidateName = 'Priya',
  candidateInitials = 'PD',
  currentDate = 'Wednesday, 12 Aug',
  score = 706,
  maxScore = 999,
  bandName = 'Emerging',
  bandNumber = 1,
  bandTotal = 4,
  scoreGain = 26,
  fixesLeft = 2,
  fixesWorth = 32,
  pointsToNextBand = 28,
  nextBandName = 'Building',
  activeTab = 'home',
  onTabPress,
  onExploreJobs,
  onScorePress,
  onAttributeCheckPress,
  onMockInterviewPress,
  onAllJobsPress,
  onJobPress,
  onNotificationsPress,
  onProfilePress,
}: HomeScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.greetingCol}>
              <Text style={styles.dateText}>{currentDate}</Text>
              <Text style={styles.greetingText}>Hi, {candidateName}</Text>
            </View>

            <View style={styles.headerActionsRow}>
              {/* Notification Bell Button with Red Badge */}
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onNotificationsPress}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Bell size={18} color={Colors.navy} weight="bold" />
                <View style={styles.unreadDot} />
              </Pressable>

              {/* Profile Avatar Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.avatarButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onProfilePress}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                <Text style={styles.avatarText}>{candidateInitials}</Text>
              </Pressable>
            </View>
          </View>

          {/* Opportunity Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroTitle}>
                Your next opportunity{'\n'}starts here.
              </Text>
              <Text style={styles.heroSubtitle}>
                See where you stand and{'\n'}find roles that fit.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.exploreButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onExploreJobs}
              >
                <Text style={styles.exploreText}>Explore</Text>
                <ArrowRight size={12} color="#FFFFFF" weight="bold" />
              </Pressable>
            </View>

            <View style={styles.heroRightCol}>
              <Image
                source={require('../../assets/icons/home-hero.jpeg')}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Your Score Card */}
          <Pressable
            style={({ pressed }) => [
              styles.scoreCard,
              pressed && styles.cardPressed,
            ]}
            onPress={onScorePress}
          >
            {/* Score Top Row */}
            <View style={styles.scoreTopRow}>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreEyebrow}>YOUR SCORE</Text>
                <View style={styles.scoreNumberRow}>
                  <Text style={styles.bigScoreText}>{score}</Text>
                  <Text style={styles.maxScoreText}>/ {maxScore}</Text>
                  <View style={styles.trendBadge}>
                    <TrendUp size={12} color="#F4D685" weight="bold" />
                    <Text style={styles.trendText}>+{scoreGain}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.bandStatusCol}>
                <Text style={styles.bandTitle}>{bandName}</Text>
                <View style={styles.bandBadge}>
                  <Text style={styles.bandBadgeText}>
                    BAND {bandNumber} OF {bandTotal}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4-segment progress bar */}
            <View style={styles.segmentsRow}>
              <View style={[styles.segment, styles.segmentActive]} />
              <View style={[styles.segment, styles.segmentInactive]} />
              <View style={[styles.segment, styles.segmentInactive]} />
              <View style={[styles.segment, styles.segmentInactive]} />
            </View>

            {/* Score Footer Meta Row */}
            <View style={styles.scoreFooterRow}>
              <Text style={styles.fixesLeftText}>
                {fixesLeft} fixes left · worth about +{fixesWorth}
              </Text>
              <View style={styles.nextBandRow}>
                <Text style={styles.nextBandText}>
                  {pointsToNextBand} to {nextBandName}
                </Text>
                <ArrowRight size={14} color="#FFFFFF" weight="bold" />
              </View>
            </View>
          </Pressable>

          {/* "GO FURTHER" Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionEyebrowRow}>
              <RocketLaunch size={12} color="#A87C17" weight="bold" />
              <Text style={styles.sectionEyebrowText}>GO FURTHER</Text>
            </View>

            <View style={styles.featureGrid}>
              {/* Feature 1: Attribute check */}
              <Pressable
                style={({ pressed }) => [
                  styles.featureCard,
                  styles.attributeCardBg,
                  pressed && styles.cardPressed,
                ]}
                onPress={onAttributeCheckPress}
              >
                <View style={styles.featureImageContainer}>
                  <Image
                    source={require('../../assets/icons/card-attr.png')}
                    style={styles.featureImage}
                    resizeMode="contain"
                  />
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Attribute check</Text>
                  <Text style={styles.featureMeta}>24 questions · 6 min</Text>
                </View>
              </Pressable>

              {/* Feature 2: Mock interview */}
              <Pressable
                style={({ pressed }) => [
                  styles.featureCard,
                  styles.mockCardBg,
                  pressed && styles.cardPressed,
                ]}
                onPress={onMockInterviewPress}
              >
                <View style={styles.featureImageContainer}>
                  <Image
                    source={require('../../assets/icons/card-mock.png')}
                    style={styles.featureImage}
                    resizeMode="contain"
                  />
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>₹299</Text>
                  </View>
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>Mock interview</Text>
                  <Text style={styles.featureMeta}>6 questions · 15 min</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* "JOBS YOU QUALIFY FOR" Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.jobsHeaderRow}>
              <View style={styles.sectionEyebrowRow}>
                <Briefcase size={12} color="#A87C17" weight="bold" />
                <Text style={styles.sectionEyebrowText}>JOBS YOU QUALIFY FOR</Text>
              </View>

              <Pressable
                style={styles.allJobsButton}
                onPress={onAllJobsPress}
              >
                <Text style={styles.allJobsText}>All 28</Text>
                <CaretRight size={12} color={Colors.navy} weight="bold" />
              </Pressable>
            </View>

            {/* Job Card 1: Lab Analyst Trainee */}
            <Pressable
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onJobPress?.('job-1')}
            >
              <View style={styles.companyMonogram}>
                <Text style={styles.monogramText}>SD</Text>
              </View>

              <View style={styles.jobInfoCol}>
                <Text style={styles.jobTitleText}>Lab Analyst Trainee</Text>
                <Text style={styles.jobCompanyText}>Sterling Diagnostics · Kothrud</Text>
                <Text style={styles.jobSalaryText}>₹18,000–24,000/mo</Text>
              </View>

              <View style={styles.matchBadge}>
                <CheckCircle size={12} color="#1F6B45" weight="fill" />
                <Text style={styles.matchBadgeText}>MATCH</Text>
              </View>
            </Pressable>

            {/* Job Card 2: QC Assistant */}
            <Pressable
              style={({ pressed }) => [
                styles.jobCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onJobPress?.('job-2')}
            >
              <View style={styles.companyMonogram}>
                <Text style={styles.monogramText}>NF</Text>
              </View>

              <View style={styles.jobInfoCol}>
                <Text style={styles.jobTitleText}>QC Assistant</Text>
                <Text style={styles.jobCompanyText}>Nivara Foods · Hinjawadi</Text>
                <Text style={styles.jobSalaryText}>₹20,000–26,000/mo</Text>
              </View>

              <View style={styles.shortBadge}>
                <Text style={styles.shortBadgeText}>14 SHORT</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Floating Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={(tab, href) => onTabPress?.(tab, href)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFCF7', // Brand Canvas
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg, // 20px
    paddingTop: Spacing.md, // 12px
    paddingBottom: 90, // Room for floating tab bar
    gap: Spacing.lg, // 20px
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingCol: {
    gap: 2,
  },
  dateText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  greetingText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: Colors.navy, // #0A1931
    fontWeight: '700',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E0D4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B23A1E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#D4AF37', // Gold monogram
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  heroCard: {
    backgroundColor: '#D4CAE7',
    borderWidth: 1,
    borderColor: '#C3B7DE',
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 164,
  },
  heroLeftCol: {
    flex: 1,
    minWidth: 0,
    padding: 18,
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.6,
    color: Colors.navy, // #0A1931
    fontWeight: '700',
  },
  heroSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(10, 25, 49, 0.72)',
  },
  exploreButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.pill, // 999
    marginTop: 4,
  },
  exploreText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroRightCol: {
    width: 142,
    height: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: 142,
    height: 164,
  },
  scoreCard: {
    backgroundColor: Colors.navy, // #0A1931
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  scoreTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  scoreCol: {
    gap: 6,
  },
  scoreEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.4,
    color: Colors.text.mutedOnNavy, // #9DA9BE
    fontWeight: '700',
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bigScoreText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -1.8,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  maxScoreText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    lineHeight: 14,
    color: '#F4D685',
    fontWeight: '700',
  },
  bandStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bandTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(244, 214, 133, 0.16)',
  },
  bandBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.0,
    color: '#F4D685',
    fontWeight: '700',
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: Radii.pill,
  },
  segmentActive: {
    backgroundColor: '#F4D685',
  },
  segmentInactive: {
    backgroundColor: 'rgba(255, 252, 247, 0.16)',
  },
  scoreFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  fixesLeftText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  nextBandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextBandText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#F4D685',
    fontWeight: '500',
  },
  sectionContainer: {
    gap: 12,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionEyebrowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    color: '#5F6B80',
    fontWeight: '700',
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    overflow: 'hidden',
  },
  attributeCardBg: {
    backgroundColor: '#DDD6F2',
    borderColor: '#CDC4EA',
  },
  mockCardBg: {
    backgroundColor: '#CFD8ED',
    borderColor: '#BDC8E3',
  },
  featureImageContainer: {
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  freeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.navy, // #0A1931
  },
  freeBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priceBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.navy, // #0A1931
  },
  priceBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  featureInfo: {
    paddingTop: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  featureTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: Colors.navy, // #0A1931
    fontWeight: '700',
  },
  featureMeta: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#3A4761',
  },
  jobsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allJobsText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.navy,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  companyMonogram: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 16,
    color: '#D4AF37', // Gold
    fontWeight: '700',
  },
  jobInfoCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  jobTitleText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
    fontWeight: '600',
  },
  jobCompanyText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  jobSalaryText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.navy,
    marginTop: 2,
    fontWeight: '700',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#E6F1EA',
  },
  matchBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#1F6B45',
    fontWeight: '700',
  },
  shortBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#F7EFD6',
  },
  shortBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    color: '#7A5C0E',
    fontWeight: '700',
  },
});
