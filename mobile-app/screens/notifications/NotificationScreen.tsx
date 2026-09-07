/**
 * BharatPath — NotificationScreen
 * Matches Screen 15 from BharatPath Handoff ("Can we message you?")
 * and serves as the Notifications Hub for the app.
 * Features:
 * - Circular back button & TopBar
 * - "Can we message you?" with the 3 strict communication guarantees
 * - 3D Bell illustration
 * - Action buttons: "Allow notifications" / "Not now"
 * - Preferences state showing active channels (WhatsApp, Push, SMS)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Eye,
  ChatCircleText,
  Target,
  CheckCircle,
  BellSimpleRinging,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface NotificationScreenProps {
  onBack?: () => void;
  onAllow?: () => void;
  onNotNow?: () => void;
  initialEnabled?: boolean;
}

export function NotificationScreen({
  onBack,
  onAllow,
  onNotNow,
  initialEnabled = false,
}: NotificationScreenProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [allowWhatsapp, setAllowWhatsapp] = useState(true);
  const [allowPush, setAllowPush] = useState(true);

  const handleAllow = () => {
    setIsEnabled(true);
    if (onAllow) {
      onAllow();
    }
  };

  const handleNotNow = () => {
    if (onNotNow) {
      onNotNow();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
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
            <Text style={styles.topBarTitle}>Notifications</Text>
          </View>

          {/* Heading Section */}
          <View style={styles.headingSection}>
            <Text style={styles.mainTitle}>Can we message you?</Text>
            <Text style={styles.mainSubtitle}>
              Only these three things. Nothing else, ever.
            </Text>
          </View>

          {/* 3 Value Proposition Cards */}
          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <Eye size={20} color={Colors.indigo} weight="duotone" />
              <Text style={styles.cardText}>
                An employer opened your profile
              </Text>
            </View>

            <View style={styles.card}>
              <ChatCircleText size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.cardText}>
                Your application moved forward
              </Text>
            </View>

            <View style={styles.card}>
              <Target size={20} color={Colors.navy} weight="duotone" />
              <Text style={styles.cardText}>
                A job you nearly qualify for opened
              </Text>
            </View>
          </View>

          {/* Center Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={require('@/assets/icons/notify-bell.png')}
              style={styles.bellImage}
              resizeMode="contain"
            />
          </View>

          {/* Status feedback if enabled */}
          {isEnabled ? (
            <View style={styles.enabledBox}>
              <View style={styles.enabledRow}>
                <CheckCircle size={20} color="#15803D" weight="fill" />
                <Text style={styles.enabledText}>
                  Notifications are enabled for your account.
                </Text>
              </View>
              <View style={styles.channelToggles}>
                <Pressable
                  style={styles.channelRow}
                  onPress={() => setAllowWhatsapp(!allowWhatsapp)}
                >
                  <Text style={styles.channelLabel}>WhatsApp Updates</Text>
                  <View
                    style={[
                      styles.toggleMini,
                      allowWhatsapp && styles.toggleMiniActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        allowWhatsapp && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>
                <Pressable
                  style={styles.channelRow}
                  onPress={() => setAllowPush(!allowPush)}
                >
                  <Text style={styles.channelLabel}>Push Notifications</Text>
                  <View
                    style={[
                      styles.toggleMini,
                      allowPush && styles.toggleMiniActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        allowPush && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Bottom Action Buttons */
            <View style={styles.bottomActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.allowButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleAllow}
                accessibilityRole="button"
              >
                <BellSimpleRinging size={18} color="#FFFFFF" weight="bold" />
                <Text style={styles.allowButtonText}>Allow notifications</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.notNowButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleNotNow}
                accessibilityRole="button"
              >
                <Text style={styles.notNowButtonText}>Not now</Text>
              </Pressable>
            </View>
          )}
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
    gap: 20,
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
    fontWeight: '600',
  },
  headingSection: {
    gap: 2,
  },
  mainTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: Colors.navy,
    fontWeight: '700',
  },
  mainSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#3A4761',
  },
  cardsContainer: {
    gap: 8,
  },
  card: {
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
  cardText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy,
    fontWeight: '500',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  bellImage: {
    width: '80%',
    height: 180,
    alignSelf: 'center',
  },
  bottomActions: {
    marginTop: 'auto',
    gap: 8,
  },
  allowButton: {
    width: '100%',
    backgroundColor: Colors.navy,
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  allowButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notNowButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowButtonText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
    fontWeight: '500',
  },
  enabledBox: {
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  enabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enabledText: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#15803D',
    fontWeight: '600',
  },
  channelToggles: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4EFE4',
    paddingTop: 12,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy,
  },
  toggleMini: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD6C7',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleMiniActive: {
    backgroundColor: Colors.navy,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
