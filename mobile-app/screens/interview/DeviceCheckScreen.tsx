import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  VideoCamera,
  Microphone,
  SunDim,
  WifiHigh,
  HardDrives,
  CheckCircle,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';
import { UpiPaymentSheet } from './UpiPaymentSheet';

export interface DeviceCheckScreenProps {
  onBack?: () => void;
  onPaymentComplete?: () => void;
}

export function DeviceCheckScreen({
  onBack,
  onPaymentComplete,
}: DeviceCheckScreenProps) {
  const router = useRouter();
  const [showPaymentSheet, setShowPaymentSheet] = useState<boolean>(false);
  const [isTestingLighting, setIsTestingLighting] = useState<boolean>(false);
  const [lightingPassed, setLightingPassed] = useState<boolean>(false);

  // Audio wave animation
  const waveAnim1 = new Animated.Value(6);
  const waveAnim2 = new Animated.Value(14);
  const waveAnim3 = new Animated.Value(8);
  const waveAnim4 = new Animated.Value(12);

  useEffect(() => {
    const createLoop = (anim: Animated.Value, minH: number, maxH: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxH,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minH,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const loop1 = createLoop(waveAnim1, 4, 16, 450);
    const loop2 = createLoop(waveAnim2, 8, 18, 550);
    const loop3 = createLoop(waveAnim3, 4, 14, 400);
    const loop4 = createLoop(waveAnim4, 6, 17, 600);

    loop1.start();
    loop2.start();
    loop3.start();
    loop4.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
      loop4.stop();
    };
  }, []);

  const handleBack = () => {
    if (showPaymentSheet) {
      setShowPaymentSheet(false);
      return;
    }
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/mock-interview' as any);
    }
  };

  const handleTestLighting = () => {
    setIsTestingLighting(true);
    setTimeout(() => {
      setIsTestingLighting(false);
      setLightingPassed(true);
    }, 1200);
  };

  const handleContinue = () => {
    setShowPaymentSheet(true);
  };

  const handleSuccessfulPayment = () => {
    setShowPaymentSheet(false);
    if (onPaymentComplete) {
      onPaymentComplete();
    } else {
      router.push('/payment-confirmation' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Dimmed backdrop container when payment sheet is open */}
        <View style={[styles.mainWrapper, showPaymentSheet && styles.mainWrapperDimmed]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={18} color="#0A1931" weight="bold" />
            </Pressable>

            <Text style={styles.headerTitle}>Device check</Text>

            <Text style={styles.counterText}>
              {lightingPassed ? '5/5' : '4/5'}
            </Text>
          </View>

          {/* Scrollable Check List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.screenTitle}>Let's test your phone</Text>
              <Text style={styles.screenSubtitle}>
                Before you pay, not after. If something fails here, you keep your money.
              </Text>
            </View>

            {/* Hardware Items List */}
            <View style={styles.checkList}>
              {/* 1. Camera */}
              <View style={styles.checkCard}>
                <VideoCamera size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.checkLabel}>Camera</Text>
                <Text style={styles.checkStatusText}>Front, working</Text>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
              </View>

              {/* 2. Microphone */}
              <View style={styles.checkCard}>
                <Microphone size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.checkLabel}>Microphone</Text>

                {/* Animated Audio Wave Bars */}
                <View style={styles.audioWaveContainer}>
                  <Animated.View style={[styles.waveBar, { height: waveAnim1 }]} />
                  <Animated.View style={[styles.waveBar, { height: waveAnim2 }]} />
                  <Animated.View style={[styles.waveBar, { height: waveAnim3 }]} />
                  <Animated.View style={[styles.waveBar, { height: waveAnim4 }]} />
                </View>

                <CheckCircle size={20} color="#1F6B45" weight="fill" />
              </View>

              {/* 3. Lighting (Warning or Passed state) */}
              {lightingPassed ? (
                <View style={styles.checkCard}>
                  <SunDim size={20} color="#0A1931" weight="duotone" />
                  <Text style={styles.checkLabel}>Lighting</Text>
                  <Text style={styles.checkStatusText}>Adequate, face clear</Text>
                  <CheckCircle size={20} color="#1F6B45" weight="fill" />
                </View>
              ) : (
                <View style={styles.warningCard}>
                  <SunDim size={20} color="#7A5C0E" weight="duotone" />
                  <View style={styles.warningTextContainer}>
                    <Text style={styles.warningTitle}>Lighting</Text>
                    <Text style={styles.warningDesc}>
                      Too dark to see your face. Turn towards a window or switch a light on.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.testAgainButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={handleTestLighting}
                      disabled={isTestingLighting}
                    >
                      {isTestingLighting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.testAgainButtonText}>Test again</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 4. Network */}
              <View style={styles.checkCard}>
                <WifiHigh size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.checkLabel}>Network</Text>
                <Text style={styles.checkStatusMono}>4G · 1.8 Mbps</Text>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
              </View>

              {/* 5. Storage */}
              <View style={styles.checkCard}>
                <HardDrives size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.checkLabel}>Storage</Text>
                <Text style={styles.checkStatusMono}>2.4 GB free</Text>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
              </View>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Bottom Actions */}
            <View style={styles.bottomSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel="Continue anyway"
              >
                <Text style={styles.primaryButtonText}>Continue anyway</Text>
              </Pressable>

              <Text style={styles.disclaimerText}>
                Lighting is a warning, not a blocker — audio-only still works
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Sheet Payment Modal */}
        {showPaymentSheet && (
          <UpiPaymentSheet
            amount={299}
            onClose={() => setShowPaymentSheet(false)}
            onPaySuccess={handleSuccessfulPayment}
          />
        )}
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
    position: 'relative',
  },
  mainWrapper: {
    flex: 1,
  },
  mainWrapperDimmed: {
    opacity: 0.25,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#0A1931',
    marginLeft: 4,
  },
  counterText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    color: '#3A4761',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },

  // ─── TITLE SECTION ─────────────────────────────────────────────────────────
  titleSection: {
    marginTop: 12,
    marginBottom: 20,
    gap: 6,
  },
  screenTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.4,
    color: '#0A1931',
  },
  screenSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },

  // ─── CHECK LIST ────────────────────────────────────────────────────────────
  checkList: {
    gap: 10,
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  checkLabel: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  checkStatusText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: '#5F6B80',
    marginRight: 6,
  },
  checkStatusMono: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: '#5F6B80',
    marginRight: 6,
  },

  // ─── AUDIO WAVE ────────────────────────────────────────────────────────────
  audioWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    gap: 3.5,
    marginRight: 8,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#5F4DB2',
    borderRadius: 2,
  },

  // ─── WARNING LIGHTING CARD ─────────────────────────────────────────────────
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    borderRadius: 16,
    padding: 16,
  },
  warningTextContainer: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  warningDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#7A5C0E',
  },
  testAgainButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: '#5F4DB2',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testAgainButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },

  spacer: {
    flex: 1,
    minHeight: 28,
  },

  // ─── BOTTOM ACTIONS ────────────────────────────────────────────────────────
  bottomSection: {
    marginTop: 16,
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#5F4DB2',
    borderRadius: Radii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  disclaimerText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
    textAlign: 'center',
  },
});
