import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, LockSimple } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

const STATUS_MESSAGES = [
  'Reading your projects',
  'Measuring real impact',
  'Matching skills to roles',
  'Checking how it reads',
  'Comparing with peers',
];

interface ScoringScreenProps {
  onShowScore?: () => void;
}

export function ScoringScreen({ onShowScore }: ScoringScreenProps) {
  const [statusIdx, setStatusIdx] = useState(1); // Default to 'Measuring real impact'

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Scoring your resume</Text>
            <Text style={styles.subtitle}>Same five categories for everyone.</Text>
          </View>

          {/* Pillars Illustration & Working Status Card */}
          <View style={styles.heroSection}>
            <View style={styles.pillarsWrapper}>
              <Image
                source={require('../../assets/icons/pillars.png')}
                style={styles.pillarsImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.workingCard}>
              <Text style={styles.workingEyebrow}>WORKING</Text>
              <View style={styles.statusTextWrapper}>
                <Text style={styles.statusText} numberOfLines={1}>
                  {STATUS_MESSAGES[statusIdx]}
                </Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '64%' }]} />
                </View>
                <Text style={styles.categoryCountText}>3 OF 5 CATEGORIES</Text>
              </View>
            </View>
          </View>

          {/* Categories Progress List */}
          <View style={styles.categoriesCard}>
            {/* Category 1: Education */}
            <View style={styles.categoryRow}>
              <CheckCircle size={20} color="#1F6B45" weight="fill" />
              <Text style={styles.categoryTitle}>Education</Text>
              <Text style={styles.categoryMeta}>scored</Text>
            </View>

            {/* Category 2: Skills */}
            <View style={[styles.categoryRow, styles.rowBorderTop]}>
              <CheckCircle size={20} color="#1F6B45" weight="fill" />
              <Text style={styles.categoryTitle}>Skills</Text>
              <Text style={styles.categoryMeta}>scored</Text>
            </View>

            {/* Category 3: Experience */}
            <View style={[styles.categoryRow, styles.rowBorderTop]}>
              <CheckCircle size={20} color="#1F6B45" weight="fill" />
              <Text style={styles.categoryTitle}>Experience</Text>
              <Text style={styles.categoryMeta}>scored</Text>
            </View>

            {/* Category 4: Projects (Active State) */}
            <View style={[styles.categoryRow, styles.activeRow]}>
              <ActivityIndicator size="small" color="#5E4DB2" style={styles.spinner} />
              <Text style={styles.categoryTitle}>Projects</Text>
            </View>

            {/* Category 5: Presentation (Dimmed / Pending) */}
            <View style={[styles.categoryRow, styles.rowBorderTop, styles.dimmedRow]}>
              <View style={styles.emptyCircleIcon} />
              <Text style={styles.categoryTitle}>Presentation</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA Action Area */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.showScoreButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onShowScore}
          >
            <Text style={styles.showScoreButtonText}>Show my score</Text>
          </Pressable>

          <View style={styles.privacyNoteRow}>
            <LockSimple size={16} color="#5F6B80" weight="bold" />
            <Text style={styles.privacyNoteText}>Employers see it only if you apply.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.offWhite, // #FFFCF7
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg, // 20px
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingTop: Spacing.xl, // 24px
    paddingBottom: Spacing.xl, // 24px
    gap: Spacing.lg, // 20px
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: Colors.navy, // #0A1931
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
  },
  heroSection: {
    gap: Spacing.sm,
  },
  pillarsWrapper: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -16,
  },
  pillarsImage: {
    width: '100%',
    height: '100%',
  },
  workingCard: {
    backgroundColor: Colors.indigo, // #5E4DB2
    borderRadius: Radii.cardLg, // 24px
    padding: Spacing.xl, // 22px
    gap: Spacing.base, // 18px
  },
  workingEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.5,
    color: '#E0DBF4',
  },
  statusTextWrapper: {
    height: 28,
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  progressSection: {
    gap: Spacing.sm, // 8px
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
    backgroundColor: '#FFFCF7',
  },
  categoryCountText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.7,
    color: '#DED9F3',
  },
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base, // 16px
    gap: Spacing.md, // 12px
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F4EFE4',
  },
  activeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E7E0D4',
    backgroundColor: '#F4EFE4',
  },
  dimmedRow: {
    opacity: 0.55,
  },
  spinner: {
    marginRight: 2,
  },
  emptyCircleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C6BFAF',
  },
  categoryTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  categoryMeta: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  bottomSection: {
    gap: Spacing.md, // 12px
    paddingBottom: Spacing.xl, // 24px
    paddingTop: Spacing.sm, // 8px
    backgroundColor: Colors.offWhite,
  },
  showScoreButton: {
    width: '100%',
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  showScoreButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.offWhite,
  },
  privacyNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm, // 8px
  },
  privacyNoteText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
});
