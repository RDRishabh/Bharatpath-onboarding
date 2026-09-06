import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Check, ClockCounterClockwise } from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';

export interface PaymentConfirmationScreenProps {
  amount?: string;
  referenceNumber?: string;
  validUntil?: string;
  onStartInterview?: () => void;
  onGoHome?: () => void;
}

export function PaymentConfirmationScreen({
  amount = '₹299.00',
  referenceNumber = 'BP4X29K71',
  validUntil = '11 Sep 2026',
  onStartInterview,
  onGoHome,
}: PaymentConfirmationScreenProps) {
  const router = useRouter();

  const handleStartInterview = () => {
    if (onStartInterview) {
      onStartInterview();
    } else {
      router.replace('/home');
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.replace('/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.content}>
          {/* Large Success Checkmark Badge */}
          <View style={styles.successBadge}>
            <Check size={38} color="#FFFFFF" weight="bold" />
          </View>

          {/* Titles */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Payment confirmed</Text>
            <Text style={styles.subtitle}>
              Your bank confirmed the payment and your session is now unlocked.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            {/* Amount Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <View style={styles.amountBadgeRow}>
                <View style={styles.paidChip}>
                  <Text style={styles.paidChipText}>PAID</Text>
                </View>
                <Text style={styles.amountValueText}>{amount}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Reference Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.referenceText}>{referenceNumber}</Text>
            </View>

            <View style={styles.divider} />

            {/* Valid Until Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valid until</Text>
              <Text style={styles.validUntilText}>{validUntil}</Text>
            </View>
          </View>

          {/* 30-Day Expiry Notice */}
          <View style={styles.noticeCard}>
            <ClockCounterClockwise size={18} color="#5F6B80" weight="bold" />
            <Text style={styles.noticeText}>
              No need to start now. Your session waits 30 days and a receipt is in your profile.
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleStartInterview}
            accessibilityRole="button"
            accessibilityLabel="Start the interview"
          >
            <Text style={styles.primaryButtonText}>Start the interview</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGoHome}
            accessibilityRole="button"
            accessibilityLabel="Later, take me home"
          >
            <Text style={styles.secondaryButtonText}>Later, take me home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  content: {
    gap: 20,
    justifyContent: 'center',
    flex: 1,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1F6B45',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#1F6B45',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  titleSection: {
    gap: 6,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: '#0A1931',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#3A4761',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  detailLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },
  amountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  paidChip: {
    backgroundColor: '#E6F1EA',
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidChipText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#1F6B45',
  },
  amountValueText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
    color: '#0A1931',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EBDF',
  },
  referenceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
    color: '#0A1931',
  },
  validUntilText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    color: '#0A1931',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F7F4EC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#3A4761',
  },
  bottomSection: {
    gap: 8,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0A1931',
    borderRadius: Radii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6B80',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
