/**
 * BharatPath — WhoHasSeenMeScreen
 * Exactly matches Screen 41 from BharatPath Handoff and Screenshot 2.
 * Features:
 * - Circular back button & TopBar
 * - Title "Every unlock, logged" + subtitle
 * - Employer activity logs (Aurum Labs, Sterling Diagnostics, Kanhaiya Logistics)
 * - "Let employers find me" toggle switch
 * - Privacy protection banner
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, LockOpen, Eye, Info } from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface WhoHasSeenMeScreenProps {
  onBack?: () => void;
  defaultLetEmployersFindMe?: boolean;
}

export function WhoHasSeenMeScreen({
  onBack,
  defaultLetEmployersFindMe = true,
}: WhoHasSeenMeScreenProps) {
  const [letEmployersFindMe, setLetEmployersFindMe] = useState(
    defaultLetEmployersFindMe
  );

  // Smooth switch animation
  const switchAnim = useRef(
    new Animated.Value(defaultLetEmployersFindMe ? 1 : 0)
  ).current;

  const toggleSwitch = () => {
    const nextVal = !letEmployersFindMe;
    setLetEmployersFindMe(nextVal);
    Animated.spring(switchAnim, {
      toValue: nextVal ? 1 : 0,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const switchTranslateX = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const switchBgColor = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#DDD6C7', '#0A1931'],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with back button */}
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
            <Text style={styles.topBarTitle}>Who has seen me</Text>
          </View>

          {/* Heading Section */}
          <View style={styles.headingSection}>
            <Text style={styles.mainTitle}>Every unlock, logged</Text>
            <Text style={styles.mainSubtitle}>
              Details shows only when an employer spends an unlock.
            </Text>
          </View>

          {/* Employer Activity List */}
          <View style={styles.listContainer}>
            {/* Card 1: Aurum Labs */}
            <View style={styles.employerCard}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>AT</Text>
              </View>
              <View style={styles.employerInfo}>
                <Text style={styles.companyName}>Aurum Labs</Text>
                <Text style={styles.activityTime}>
                  15 July · unlocked your contact
                </Text>
              </View>
              <LockOpen size={18} color={Colors.indigo} weight="fill" />
            </View>

            {/* Card 2: Sterling Diagnostics */}
            <View style={styles.employerCard}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>SD</Text>
              </View>
              <View style={styles.employerInfo}>
                <Text style={styles.companyName}>Sterling Diagnostics</Text>
                <Text style={styles.activityTime}>
                  Today · viewed masked profile
                </Text>
              </View>
              <Eye size={18} color="#5F6B80" weight="bold" />
            </View>

            {/* Card 3: Kanhaiya Logistics */}
            <View style={styles.employerCard}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>KL</Text>
              </View>
              <View style={styles.employerInfo}>
                <Text style={styles.companyName}>Kanhaiya Logistics</Text>
                <Text style={styles.activityTime}>
                  5 June · unlocked your contact
                </Text>
              </View>
              <LockOpen size={18} color={Colors.navy} weight="fill" />
            </View>
          </View>

          {/* Toggle Card: Let employers find me */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Let employers find me</Text>
              <Text style={styles.toggleSub}>
                Turn off and you only appear where you apply
              </Text>
            </View>
            <Pressable
              onPress={toggleSwitch}
              accessibilityRole="switch"
              accessibilityState={{ checked: letEmployersFindMe }}
              accessibilityLabel="Let employers find me"
            >
              <Animated.View
                style={[
                  styles.switchTrack,
                  { backgroundColor: switchBgColor },
                ]}
              >
                <Animated.View
                  style={[
                    styles.switchThumb,
                    { transform: [{ translateX: switchTranslateX }] },
                  ]}
                />
              </Animated.View>
            </Pressable>
          </View>

          {/* Bottom Privacy Disclaimer Card */}
          <View style={styles.privacyBanner}>
            <Info size={18} color="#3A4761" weight="bold" />
            <Text style={styles.privacyBannerText}>
              Your resume file is never shared. Employers see the parsed profile only.
            </Text>
          </View>
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
    paddingBottom: Spacing.xl,
    gap: 16,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
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
    fontWeight: '600',
  },
  headingSection: {
    gap: 2,
  },
  mainTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: Colors.navy,
    fontWeight: '700',
  },
  mainSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },
  listContainer: {
    gap: 8,
  },
  employerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    lineHeight: 16,
    color: '#D4AF37', // Brand gold
    fontWeight: '700',
  },
  employerInfo: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
    fontWeight: '600',
  },
  activityTime: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
    fontWeight: '600',
  },
  toggleSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  privacyBanner: {
    marginTop: 'auto',
    backgroundColor: '#F4EFE4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyBannerText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
});
