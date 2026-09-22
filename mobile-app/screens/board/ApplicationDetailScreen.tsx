/**
 * BharatPath — ApplicationDetailScreen
 * Exactly matches Screen 39 from BharatPath Handoff and Screenshot 1.
 * Features:
 * - Circular back button & top bar
 * - Company header (Aurum Labs, Baner, Pune · ₹19k–25k, "Interview" badge)
 * - "YOUR INTERVIEW" card (Tomorrow 11:00 am, video call details, Join call & Reschedule buttons)
 * - "Where things stand" timeline (5-stage step connector with active dashed icon)
 * - "Withdraw application" action button
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
  ArrowLeft,
  VideoCamera,
  CheckCircle,
  CircleDashed,
  ArrowUUpLeft,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface ApplicationDetailScreenProps {
  roleTitle?: string;
  companyName?: string;
  companyInitials?: string;
  locationAndSalary?: string;
  interviewTime?: string;
  interviewDesc?: string;
  onBack?: () => void;
  onJoinCall?: () => void;
  onReschedule?: () => void;
  onWithdraw?: () => void;
}

export function ApplicationDetailScreen({
  roleTitle = 'Quality Trainee',
  companyName = 'Aurum Labs',
  companyInitials = 'AT',
  locationAndSalary = 'Baner, Pune · ₹19k–25k',
  interviewTime = 'Tomorrow, 11:00 am',
  interviewDesc = 'Video call, about 30 minutes, with Meera Kulkarni (Lab Head).',
  onBack,
  onJoinCall,
  onReschedule,
  onWithdraw,
}: ApplicationDetailScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with circular back button */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={16} color={Colors.navy} weight="bold" />
            </Pressable>
            <Text style={styles.topBarTitle}>{roleTitle}</Text>
          </View>

          {/* Company & Role Summary */}
          <View style={styles.companyHeader}>
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>{companyInitials}</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyTitle}>{companyName}</Text>
              <Text style={styles.companySub}>{locationAndSalary}</Text>
            </View>
            <View style={styles.interviewBadgePill}>
              <Text style={styles.interviewBadgeText}>Interview</Text>
            </View>
          </View>

          {/* "YOUR INTERVIEW" Card */}
          <View style={styles.interviewCard}>
            <View style={styles.eyebrowRow}>
              <VideoCamera size={18} color="#5E4DB2" weight="fill" />
              <Text style={styles.eyebrowText}>YOUR INTERVIEW</Text>
            </View>

            <Text style={styles.interviewTitleText}>{interviewTime}</Text>
            <Text style={styles.interviewDescText}>{interviewDesc}</Text>

            <View style={styles.interviewButtonsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.joinButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onJoinCall}
                accessibilityRole="button"
              >
                <Text style={styles.joinButtonText}>Join call</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.rescheduleButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onReschedule}
                accessibilityRole="button"
              >
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              </Pressable>
            </View>
          </View>

          {/* "Where things stand" Timeline Card */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Where things stand</Text>

            <View style={styles.timelineList}>
              {/* Step 1: Application sent */}
              <View style={styles.timelineStep}>
                <View style={styles.stepNodeCol}>
                  <CheckCircle size={20} color="#1F6B45" weight="fill" />
                  <View style={[styles.connectorLine, styles.lineGreen]} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Application sent</Text>
                  <Text style={styles.stepSub}>12 July, 9:30 am</Text>
                </View>
              </View>

              {/* Step 2: Profile opened by employer */}
              <View style={styles.timelineStep}>
                <View style={styles.stepNodeCol}>
                  <CheckCircle size={20} color="#1F6B45" weight="fill" />
                  <View style={[styles.connectorLine, styles.lineGreen]} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Profile opened by employer</Text>
                  <Text style={styles.stepSub}>
                    15 July · they unlocked your contact
                  </Text>
                </View>
              </View>

              {/* Step 3: Shortlisted */}
              <View style={styles.timelineStep}>
                <View style={styles.stepNodeCol}>
                  <CheckCircle size={20} color="#1F6B45" weight="fill" />
                  <View style={[styles.connectorLine, styles.lineBeige]} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Shortlisted</Text>
                  <Text style={styles.stepSub}>2 August</Text>
                </View>
              </View>

              {/* Step 4: Interview (Active/Upcoming) */}
              <View style={styles.timelineStep}>
                <View style={styles.stepNodeCol}>
                  <CircleDashed size={20} color="#5E4DB2" weight="bold" />
                  <View style={[styles.connectorLine, styles.lineBeige]} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Interview</Text>
                  <Text style={styles.stepSubActive}>Tomorrow</Text>
                </View>
              </View>

              {/* Step 5: Decision (Pending) */}
              <View style={styles.timelineStepLast}>
                <View style={styles.stepNodeColLast}>
                  <View style={styles.circleNode} />
                </View>
                <View style={styles.stepContentLast}>
                  <Text style={styles.stepTitleMuted}>Decision</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom "Withdraw application" button */}
          <Pressable
            style={({ pressed }) => [
              styles.withdrawButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onWithdraw}
            accessibilityRole="button"
          >
            <ArrowUUpLeft size={16} color="#3A4761" weight="bold" />
            <Text style={styles.withdrawButtonText}>Withdraw application</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: 16,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F1EAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 15,
    lineHeight: 20,
    color: '#4A3E8F',
  },
  companyInfo: {
    flex: 1,
    gap: 4,
  },
  companyTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.4,
    color: Colors.navy,
  },
  companySub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  interviewBadgePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
  },
  interviewBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    lineHeight: 12,
    color: Colors.navy,
  },
  interviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: '#5E4DB2', // Indigo/purple
  },
  interviewTitleText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: Colors.navy,
  },
  interviewDescText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5E4DB2',
  },
  interviewButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#5F4DB2',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  timelineTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
  },
  timelineList: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNodeCol: {
    alignItems: 'center',
    flexBasis: 20,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 22,
  },
  lineGreen: {
    backgroundColor: '#1F6B45',
  },
  lineBeige: {
    backgroundColor: '#E7E0D4',
  },
  stepContent: {
    flex: 1,
    gap: 2,
    paddingBottom: 16,
  },
  stepTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy,
  },
  stepSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  stepSubActive: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5E4DB2',
  },
  timelineStepLast: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNodeColLast: {
    alignItems: 'center',
    flexBasis: 20,
  },
  circleNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD6C7',
  },
  stepContentLast: {
    flex: 1,
    gap: 2,
  },
  stepTitleMuted: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#566073',
  },
  withdrawButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
  },
  withdrawButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#3A4761',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
