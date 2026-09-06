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
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MicrophoneStage,
  Info,
  ListNumbers,
  VideoCamera,
  FileText,
  Gauge,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';

export interface MockInterviewIntroScreenProps {
  onBack?: () => void;
  onCheckPhone?: () => void;
}

export function MockInterviewIntroScreen({
  onBack,
  onCheckPhone,
}: MockInterviewIntroScreenProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const handleCheckPhone = () => {
    if (onCheckPhone) {
      onCheckPhone();
    } else {
      router.push('/device-check' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Top Header Bar */}
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

          <Text style={styles.headerTitle}>Mock interview</Text>

          <View style={styles.priceBadge}>
            <MicrophoneStage size={13} color="#B9891A" weight="fill" />
            <Text style={styles.priceBadgeText}>₹299</Text>
          </View>
        </View>

        {/* Scrollable Body */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Illustration Card */}
          <View style={styles.heroCard}>
            <Image
              source={require('../../assets/icons/card-mock.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.screenTitle}>Practise before it counts</Text>
            <Text style={styles.screenSubtitle}>
              Six questions written for lab and QC roles. Answer on this phone and get a marked report.
            </Text>
          </View>

          {/* Before You Start Section */}
          <View style={styles.beforeStartSection}>
            <View style={styles.eyebrowRow}>
              <Info size={15} color="#A87C17" weight="bold" />
              <Text style={styles.eyebrowText}>BEFORE YOU START</Text>
            </View>

            <View style={styles.infoCard}>
              {/* Row 1: Questions */}
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <View style={styles.iconContainer}>
                  <ListNumbers size={20} color="#5E4DB2" weight="duotone" />
                </View>
                <Text style={styles.infoLabel}>Questions</Text>
                <Text style={styles.infoValue}>6 · about 15 min</Text>
              </View>

              {/* Row 2: You Record */}
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <View style={styles.iconContainer}>
                  <VideoCamera size={20} color="#0A1931" weight="duotone" />
                </View>
                <Text style={styles.infoLabel}>You record</Text>
                <Text style={styles.infoValue}>Audio or video</Text>
              </View>

              {/* Row 3: Report ready in */}
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <View style={styles.iconContainer}>
                  <FileText size={20} color="#0A1931" weight="duotone" />
                </View>
                <Text style={styles.infoLabel}>Report ready in</Text>
                <Text style={styles.infoValue}>Under 10 min</Text>
              </View>

              {/* Row 4: Resume score */}
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Gauge size={20} color="#0A1931" weight="duotone" />
                </View>
                <Text style={styles.infoLabel}>Resume score</Text>
                <Text style={styles.infoValue}>Not affected</Text>
              </View>
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
              onPress={handleCheckPhone}
              accessibilityRole="button"
              accessibilityLabel="Check my phone first"
            >
              <Text style={styles.primaryButtonText}>Check my phone first</Text>
            </Pressable>

            <Text style={styles.disclaimerText}>
              Camera, mic and network tested before any payment
            </Text>
          </View>
        </ScrollView>
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
    opacity: 0.9,
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
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  priceBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#0A1931',
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

  // ─── HERO CARD ─────────────────────────────────────────────────────────────
  heroCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#CFD8ED',
    borderWidth: 1,
    borderColor: '#BDC8E3',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '80%',
    height: '88%',
  },

  // ─── TITLE SECTION ─────────────────────────────────────────────────────────
  titleSection: {
    marginTop: 20,
    gap: 6,
  },
  screenTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: '#0A1931',
  },
  screenSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#3A4761',
  },

  // ─── BEFORE START SECTION ──────────────────────────────────────────────────
  beforeStartSection: {
    marginTop: 24,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  eyebrowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    color: '#5F6B80',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBDF',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },
  infoValue: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#0A1931',
  },

  spacer: {
    flex: 1,
    minHeight: 24,
  },

  // ─── BOTTOM ACTIONS ────────────────────────────────────────────────────────
  bottomSection: {
    marginTop: 18,
    gap: 10,
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
  disclaimerText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
    textAlign: 'center',
  },
});
