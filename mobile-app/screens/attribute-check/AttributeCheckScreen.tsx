import React, { useState } from 'react';
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
  Gift,
  Info,
  Clock,
  EyeSlash,
  LockSimple,
  Compass,
  CheckCircle,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';

export interface AttributeCheckScreenProps {
  onBack?: () => void;
  onStartQuiz?: () => void;
}

export function AttributeCheckScreen({
  onBack,
  onStartQuiz,
}: AttributeCheckScreenProps) {
  const router = useRouter();
  const [screenState, setScreenState] = useState<'intro' | 'quiz' | 'report'>('intro');
  const [selectedOption, setSelectedOption] = useState<number | null>(3); // Default 'Agree' selected as in handoff demo

  const handleBack = () => {
    if (screenState === 'report') {
      setScreenState('quiz');
      return;
    }
    if (screenState === 'quiz') {
      setScreenState('intro');
      return;
    }
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleStartQuestions = () => {
    if (onStartQuiz) {
      onStartQuiz();
    } else {
      setScreenState('quiz');
    }
  };

  // ─── 1. ATTRIBUTE INTRO SCREEN (Primary Design from Screenshot) ──────────────
  if (screenState === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.container}>
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

            <Text style={styles.headerTitle}>Attribute check</Text>

            <View style={styles.freeBadge}>
              <Gift size={13} color="#B9891A" weight="fill" />
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Illustration Card */}
            <View style={styles.heroCard}>
              <Image
                source={require('../../assets/icons/card-attr.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>

            {/* Title & Description */}
            <View style={styles.titleSection}>
              <Text style={styles.screenTitle}>How you like to work</Text>
              <Text style={styles.screenSubtitle}>
                24 questions on work style and interests. You get a profile report at the end.
              </Text>
            </View>

            {/* Before You Start Section */}
            <View style={styles.beforeStartSection}>
              <View style={styles.eyebrowRow}>
                <Info size={15} color="#A87C17" weight="bold" />
                <Text style={styles.eyebrowText}>BEFORE YOU START</Text>
              </View>

              <View style={styles.infoCard}>
                {/* Row 1: Duration */}
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <View style={styles.iconContainer}>
                    <Clock size={20} color="#5E4DB2" weight="regular" />
                  </View>
                  <Text style={styles.infoRowText}>
                    About 6 minutes. Pause whenever you like.
                  </Text>
                </View>

                {/* Row 2: Privacy */}
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <View style={styles.iconContainer}>
                    <EyeSlash size={20} color="#0A1931" weight="regular" />
                  </View>
                  <Text style={styles.infoRowText}>
                    Employers see only a badge — never your answers.
                  </Text>
                </View>

                {/* Row 3: Separate Signal */}
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <LockSimple size={20} color="#0A1931" weight="regular" />
                  </View>
                  <Text style={styles.infoRowText}>
                    Your resume score does not move. Separate signal.
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleStartQuestions}
                accessibilityRole="button"
                accessibilityLabel="Start the 24 questions"
              >
                <Text style={styles.primaryButtonText}>Start the 24 questions</Text>
              </Pressable>

              <Text style={styles.disclaimerText}>
                Nothing here changes your resume score
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 2. QUIZ QUESTIONS SCREEN (Interactive Flow) ───────────────────────────
  if (screenState === 'quiz') {
    const options = [
      'Strongly disagree',
      'Disagree',
      'Neither',
      'Agree',
      'Strongly agree',
    ];

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          {/* Header Bar with Progress */}
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back to intro"
            >
              <ArrowLeft size={18} color="#0A1931" weight="bold" />
            </Pressable>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '21%' }]} />
            </View>

            <Text style={styles.progressCounterText}>5/24</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Category Tag */}
            <View style={styles.categoryBadge}>
              <Compass size={13} color="#0A1931" weight="fill" />
              <Text style={styles.categoryBadgeText}>WORK STYLE</Text>
            </View>

            {/* Question Text */}
            <Text style={styles.questionText}>
              I would rather plan the whole week ahead than decide each morning.
            </Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {options.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => {
                      setSelectedOption(index);
                      setTimeout(() => {
                        setScreenState('report');
                      }, 260);
                    }}
                  >
                    {isSelected ? (
                      <CheckCircle size={20} color="#D4AF37" weight="fill" />
                    ) : (
                      <View style={styles.radioCircle} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Reassurance Box */}
            <View style={styles.reassuranceCard}>
              <Info size={18} color="#3A4761" weight="bold" />
              <Text style={styles.reassuranceText}>
                There are no right answers here, and none of this affects your resume score.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 3. ATTRIBUTE REPORT SCREEN (Interactive Flow) ──────────────────────────
  return (
    <View style={styles.reportRoot}>
      <StatusBar style="light" />
      {/* Dark Navy Header Section */}
      <View style={styles.reportHero}>
        <SafeAreaView edges={['top']} style={styles.reportHeroSafe}>
          <View style={styles.reportHeroHeader}>
            <Pressable
              style={({ pressed }) => [
                styles.reportBackButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={16} color="#FFFFFF" weight="bold" />
            </Pressable>
            <Text style={styles.reportHeaderTitle}>Attribute report</Text>
            <Text style={styles.reportDateText}>12 AUG 2026</Text>
          </View>

          <View style={styles.reportTypeContainer}>
            <View style={styles.reportTypeEyebrow}>
              <Compass size={14} color="#F4D685" weight="duotone" />
              <Text style={styles.reportTypeEyebrowText}>YOUR TYPE</Text>
            </View>
            <Text style={styles.reportTypeTitle}>Steady builder</Text>
            <Text style={styles.reportTypeDesc}>
              You plan first, work in order, and prefer clear instructions over improvising on the spot.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Light Surface with Attribute Details */}
      <View style={styles.reportContentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.reportScrollContent}
        >
          <Text style={styles.reportSectionLabel}>FROM 24 ANSWERS</Text>

          {/* Scores Card */}
          <View style={styles.reportScoresCard}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Consistency</Text>
                <Text style={styles.scoreValueHigh}>HIGH</Text>
              </View>
              <View style={styles.scoreMeterTrack}>
                <View style={[styles.scoreMeterFill, { width: '84%', backgroundColor: '#5E4DB2' }]} />
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Attention to detail</Text>
                <Text style={styles.scoreValueHigh}>HIGH</Text>
              </View>
              <View style={styles.scoreMeterTrack}>
                <View style={[styles.scoreMeterFill, { width: '78%', backgroundColor: '#5E4DB2' }]} />
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Working with people</Text>
                <Text style={styles.scoreValueMedium}>MEDIUM</Text>
              </View>
              <View style={styles.scoreMeterTrack}>
                <View style={[styles.scoreMeterFill, { width: '54%', backgroundColor: '#7E6FBF' }]} />
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Comfort with ambiguity</Text>
                <Text style={styles.scoreValueLow}>LOW</Text>
              </View>
              <View style={styles.scoreMeterTrack}>
                <View style={[styles.scoreMeterFill, { width: '31%', backgroundColor: '#7E6FBF' }]} />
              </View>
            </View>
          </View>

          {/* Roles Pill Section */}
          <View style={styles.rolesCard}>
            <Text style={styles.rolesCardTitle}>Roles that suit this profile</Text>
            <View style={styles.rolePillsRow}>
              {['Quality control', 'Lab analysis', 'Documentation', 'Inventory'].map(
                (role) => (
                  <View key={role} style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{role}</Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.reportActionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.reportDoneButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                if (onBack) {
                  onBack();
                } else {
                  router.back();
                }
              }}
            >
              <Text style={styles.reportDoneButtonText}>Done</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.reportTryMockButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                setScreenState('intro');
              }}
            >
              <Text style={styles.reportTryMockButtonText}>Retake check</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
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
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#0A1931',
    marginLeft: 4,
  },
  freeBadge: {
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
  freeBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#0A1931',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },

  // ─── HERO CARD ─────────────────────────────────────────────────────────────
  heroCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#DDD6F2',
    borderWidth: 1,
    borderColor: '#CDC4EA',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '78%',
    height: '84%',
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
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
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
  infoRowText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#3A4761',
  },

  // ─── BOTTOM ACTIONS ────────────────────────────────────────────────────────
  bottomSection: {
    marginTop: 26,
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

  // ─── QUIZ SPECIFIC STYLES ──────────────────────────────────────────────────
  progressBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E0D4',
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A1931',
    borderRadius: 999,
  },
  progressCounterText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: '#3A4761',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginTop: 8,
    marginBottom: 14,
  },
  categoryBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#0A1931',
  },
  questionText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: '#0A1931',
    marginBottom: 20,
  },
  optionsList: {
    gap: 9,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 16,
  },
  optionCardSelected: {
    backgroundColor: '#0A1931',
    borderColor: '#0A1931',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD6C7',
  },
  optionText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  optionTextSelected: {
    fontFamily: 'GeneralSans-Semibold',
    color: '#FFFFFF',
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4EFE4',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  reassuranceText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },

  // ─── REPORT SPECIFIC STYLES ────────────────────────────────────────────────
  reportRoot: {
    flex: 1,
    backgroundColor: '#0A1931',
  },
  reportHero: {
    backgroundColor: '#0A1931',
    paddingBottom: 26,
  },
  reportHeroSafe: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  reportHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  reportBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  reportDateText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#9DA9BE',
  },
  reportTypeContainer: {
    gap: 8,
  },
  reportTypeEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTypeEyebrowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#9DA9BE',
  },
  reportTypeTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  reportTypeDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#9DA9BE',
  },
  reportContentContainer: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  reportScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  reportSectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  reportScoresCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  scoreRow: {
    gap: 7,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreName: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: '#0A1931',
  },
  scoreValueHigh: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#5E4DB2',
  },
  scoreValueMedium: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#5F6B80',
  },
  scoreValueLow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#7E6FBF',
  },
  scoreMeterTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#F0EBDF',
    overflow: 'hidden',
  },
  scoreMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  rolesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  rolesCardTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#0A1931',
  },
  rolePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: '#F1EAF7',
  },
  rolePillText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#4A3E8F',
  },
  reportActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  reportDoneButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDoneButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#0A1931',
  },
  reportTryMockButton: {
    flex: 1.4,
    backgroundColor: '#0A1931',
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTryMockButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
