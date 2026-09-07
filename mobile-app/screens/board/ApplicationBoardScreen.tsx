/**
 * BharatPath — ApplicationBoardScreen ("Board" Screen)
 * Exactly matches Screen 38 from BharatPath Handoff and Screenshot 2.
 * Features:
 * - Title "Your applications"
 * - Filter tabs: Active · 4 & Closed · 2
 * - Application Cards:
 *   1. Aurum Labs (Quality Trainee, Stage 4/5, Interview scheduled, Tomorrow video call with Join button)
 *   2. Sterling Diagnostics (Lab Analyst Trainee, Stage 1/5, Waiting on employer, profile opened timeline)
 *   3. Kanhaiya Logistics (Data Entry Executive, Stage 2/5, Viewed then quiet, 38-day expiry warning)
 * - Sticky bottom tab bar with "Board" tab active
 */
import React, { useState } from 'react';
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
  VideoCamera,
  Eye,
  HourglassLow,
  Archive,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';
import { BottomTabBar, TabName } from '@/components/navigation/BottomTabBar';

export interface ApplicationBoardScreenProps {
  activeTab?: TabName;
  onTabPress?: (tab: TabName, href: string) => void;
  onApplicationPress?: (appId: string) => void;
  onJoinCallPress?: (appId: string) => void;
}

export function ApplicationBoardScreen({
  activeTab = 'board',
  onTabPress,
  onApplicationPress,
  onJoinCallPress,
}: ApplicationBoardScreenProps) {
  const [filter, setFilter] = useState<'active' | 'closed'>('active');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title and Filter Pills */}
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Your applications</Text>
            <View style={styles.filterRow}>
              {/* Active Pill */}
              <Pressable
                style={[
                  styles.filterPill,
                  filter === 'active'
                    ? styles.filterPillActive
                    : styles.filterPillInactive,
                ]}
                onPress={() => setFilter('active')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filter === 'active'
                      ? styles.filterPillTextActive
                      : styles.filterPillTextInactive,
                  ]}
                >
                  Active · 4
                </Text>
              </Pressable>

              {/* Closed Pill */}
              <Pressable
                style={[
                  styles.filterPill,
                  filter === 'closed'
                    ? styles.filterPillActive
                    : styles.filterPillInactive,
                ]}
                onPress={() => setFilter('closed')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filter === 'closed'
                      ? styles.filterPillTextActive
                      : styles.filterPillTextInactive,
                  ]}
                >
                  Closed · 2
                </Text>
              </Pressable>
            </View>
          </View>

          {/* List of Applications */}
          {filter === 'active' ? (
            <View style={styles.listContainer}>
              {/* Card 1: Aurum Labs (Quality Trainee) */}
              <Pressable
                style={({ pressed }) => [
                  styles.appCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onApplicationPress?.('aurum-labs')}
                accessibilityRole="button"
              >
                {/* Header info */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeNavy}>
                    <Text style={styles.badgeNavyText}>AT</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>Quality Trainee</Text>
                    <Text style={styles.roleSub}>
                      Aurum Labs · applied 12 Jul
                    </Text>
                  </View>
                  <View style={styles.tagInterview}>
                    <Text style={styles.tagInterviewText}>INTERVIEW</Text>
                  </View>
                </View>

                {/* Progress Bar (5 segments, 4 active) */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                  </View>
                  <View style={styles.stageLabelRow}>
                    <Text style={styles.stageNumberText}>STAGE 4 OF 5</Text>
                    <Text style={styles.stageStatusText}>
                      Interview scheduled
                    </Text>
                  </View>
                </View>

                {/* Action Banner inside card */}
                <View style={styles.interviewActionBanner}>
                  <VideoCamera size={17} color="#4A3E8F" weight="duotone" />
                  <Text style={styles.interviewActionText}>
                    Tomorrow, 11:00 am · video call
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.joinButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onJoinCallPress?.('aurum-labs');
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </Pressable>
                </View>
              </Pressable>

              {/* Card 2: Sterling Diagnostics (Lab Analyst Trainee) */}
              <Pressable
                style={({ pressed }) => [
                  styles.appCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onApplicationPress?.('sterling-diagnostics')}
                accessibilityRole="button"
              >
                {/* Header info */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgePurple}>
                    <Text style={styles.badgePurpleText}>SD</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>Lab Analyst Trainee</Text>
                    <Text style={styles.roleSub}>
                      Sterling Diagnostics · applied today
                    </Text>
                  </View>
                  <View style={styles.tagSent}>
                    <Text style={styles.tagSentText}>SENT</Text>
                  </View>
                </View>

                {/* Progress Bar (5 segments, 1 active) */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                  </View>
                  <View style={styles.stageLabelRow}>
                    <Text style={styles.stageNumberText}>STAGE 1 OF 5</Text>
                    <Text style={styles.stageStatusText}>
                      Waiting on employer
                    </Text>
                  </View>
                </View>

                {/* Footer status text */}
                <View style={styles.cardFooterNotice}>
                  <Eye size={14} color="#5F6B80" weight="bold" />
                  <Text style={styles.cardFooterNoticeText}>
                    Employers usually open profiles within 4 days
                  </Text>
                </View>
              </Pressable>

              {/* Card 3: Kanhaiya Logistics (Data Entry Executive) */}
              <Pressable
                style={({ pressed }) => [
                  styles.appCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onApplicationPress?.('kanhaiya-logistics')}
                accessibilityRole="button"
              >
                {/* Header info */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeYellow}>
                    <Text style={styles.badgeYellowText}>KL</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>Data Entry Executive</Text>
                    <Text style={styles.roleSub}>
                      Kanhaiya Logistics · applied 2 Jun
                    </Text>
                  </View>
                  <View style={styles.tagExpiring}>
                    <Text style={styles.tagExpiringText}>EXPIRING</Text>
                  </View>
                </View>

                {/* Progress Bar (5 segments, 2 active) */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentFilled]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                    <View style={[styles.progressSegment, styles.segmentEmpty]} />
                  </View>
                  <View style={styles.stageLabelRow}>
                    <Text style={styles.stageNumberText}>STAGE 2 OF 5</Text>
                    <Text style={styles.stageStatusText}>Viewed, then quiet</Text>
                  </View>
                </View>

                {/* Footer status text */}
                <View style={styles.cardFooterNotice}>
                  <HourglassLow size={14} color="#B9891A" weight="bold" />
                  <Text style={styles.cardFooterNoticeExpiringText}>
                    Nothing for 38 days · closes automatically in 2 days
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : (
            /* Closed Applications Empty/List State */
            <View style={styles.closedContainer}>
              <View style={styles.closedCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeGray}>
                    <Archive size={20} color="#5F6B80" weight="duotone" />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>Inventory Associate</Text>
                    <Text style={styles.roleSub}>QuickMart · Applied May 14</Text>
                  </View>
                  <View style={styles.tagClosed}>
                    <Text style={styles.tagClosedText}>CLOSED</Text>
                  </View>
                </View>
                <Text style={styles.closedReasonText}>
                  Position filled internally. Profile archived cleanly.
                </Text>
              </View>

              <View style={styles.closedCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeGray}>
                    <Archive size={20} color="#5F6B80" weight="duotone" />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>Junior QC Specialist</Text>
                    <Text style={styles.roleSub}>Apex Pharma · Applied Apr 22</Text>
                  </View>
                  <View style={styles.tagClosed}>
                    <Text style={styles.tagClosedText}>WITHDRAWN</Text>
                  </View>
                </View>
                <Text style={styles.closedReasonText}>
                  Withdrawn by candidate on 28 Apr.
                </Text>
              </View>
            </View>
          )}
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
    gap: 16,
  },
  headerSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  mainTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: Colors.navy,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  filterPillActive: {
    backgroundColor: Colors.navy,
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
  },
  filterPillText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextInactive: {
    color: '#3A4761',
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgeNavy: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNavyText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    lineHeight: 16,
    color: '#F4D685', // Brand gold accent
    fontWeight: '700',
  },
  badgePurple: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F1EAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePurpleText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    lineHeight: 16,
    color: '#4A3E8F',
    fontWeight: '700',
  },
  badgeYellow: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F7EFD6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeYellowText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    lineHeight: 16,
    color: '#7A5C0E',
    fontWeight: '700',
  },
  badgeGray: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F4EFE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  roleTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: Colors.navy,
    fontWeight: '700',
  },
  roleSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  tagInterview: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E6F1EA',
  },
  tagInterviewText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: '#1F6B45',
    fontWeight: '700',
  },
  tagSent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F4EC',
  },
  tagSentText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: '#5F6B80',
    fontWeight: '700',
  },
  tagExpiring: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7EFD6',
  },
  tagExpiringText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: '#7A5C0E',
    fontWeight: '700',
  },
  tagClosed: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0EBDF',
  },
  tagClosedText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: '#5F6B80',
    fontWeight: '700',
  },
  progressSection: {
    gap: 8,
    width: '100%',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  segmentFilled: {
    backgroundColor: '#5E4DB2', // Purple brand stage bar
  },
  segmentEmpty: {
    backgroundColor: '#F0EBDF', // Light beige unfilled bar
  },
  stageLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  stageNumberText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    color: '#5F6B80',
  },
  stageStatusText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#3A4761',
    fontWeight: '500',
  },
  interviewActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1EAF7',
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  interviewActionText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#0A1931',
    fontWeight: '500',
  },
  joinButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.navy,
  },
  joinButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBDF',
  },
  cardFooterNoticeText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  cardFooterNoticeExpiringText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#7A5C0E',
    fontWeight: '500',
  },
  closedContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  closedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  closedReasonText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
});
