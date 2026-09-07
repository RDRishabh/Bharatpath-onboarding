import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Timer,
  ArrowCounterClockwise,
  CloudArrowUp,
  EyeSlash,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';

export interface MockInterviewBriefingScreenProps {
  onBack?: () => void;
  onReady?: () => void;
}

export function MockInterviewBriefingScreen({
  onBack,
  onReady,
}: MockInterviewBriefingScreenProps) {
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

  const handleReady = () => {
    if (onReady) {
      onReady();
    } else {
      router.push('/interview-session' as any);
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
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Headings */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Before we start</Text>
            <Text style={styles.subtitle}>
              Four things worth knowing. It works like a real interview, with one difference.
            </Text>
          </View>

          {/* 4 Informational Cards */}
          <View style={styles.cardsList}>
            {/* Card 1: 30s to think */}
            <View style={styles.ruleCard}>
              <View style={styles.iconBox}>
                <Timer size={16} color="#D4AF37" weight="bold" />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleTitle}>30 seconds to think</Text>
                <Text style={styles.ruleDesc}>
                  You see each question before recording begins.
                </Text>
              </View>
            </View>

            {/* Card 2: One retake */}
            <View style={styles.ruleCard}>
              <View style={styles.iconBox}>
                <ArrowCounterClockwise size={16} color="#D4AF37" weight="bold" />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleTitle}>One retake per question</Text>
                <Text style={styles.ruleDesc}>
                  The difference from a real interview. Use it where it counts.
                </Text>
              </View>
            </View>

            {/* Card 3: Auto-save */}
            <View style={styles.ruleCard}>
              <View style={styles.iconBox}>
                <CloudArrowUp size={16} color="#D4AF37" weight="bold" />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleTitle}>Each answer saves as you finish it</Text>
                <Text style={styles.ruleDesc}>
                  If the network drops, nothing you already said is lost.
                </Text>
              </View>
            </View>

            {/* Card 4: Privacy */}
            <View style={styles.ruleCard}>
              <View style={styles.iconBox}>
                <EyeSlash size={16} color="#D4AF37" weight="bold" />
              </View>
              <View style={styles.ruleTextContainer}>
                <Text style={styles.ruleTitle}>Nobody else watches this</Text>
                <Text style={styles.ruleDesc}>
                  Recordings are used for your report and deleted after 90 days.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Bottom CTA */}
          <View style={styles.bottomSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleReady}
              accessibilityRole="button"
              accessibilityLabel="I'm ready — question 1"
            >
              <Text style={styles.primaryButtonText}>I'm ready — question 1</Text>
            </Pressable>

            <Text style={styles.disclaimerText}>
              Find a quiet spot. This takes about 15 minutes.
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  titleSection: {
    marginBottom: 20,
    gap: 6,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.4,
    color: '#0A1931',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },
  cardsList: {
    gap: 10,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0A1931',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleTextContainer: {
    flex: 1,
    gap: 4,
  },
  ruleTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  ruleDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },
  spacer: {
    flex: 1,
    minHeight: 28,
  },
  bottomSection: {
    marginTop: 16,
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
