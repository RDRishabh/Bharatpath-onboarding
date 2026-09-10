import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  GraduationCap,
  Wrench,
  Briefcase,
  Flask,
  TextAa,
  Plus,
  PencilLine,
} from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface ScoreBreakdownScreenProps {
  onBack?: () => void;
  onActionPress?: (actionKey: string) => void;
}

export function ScoreBreakdownScreen({ onBack, onActionPress }: ScoreBreakdownScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Sticky Navigation Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onBack}
            >
              <ArrowLeft size={16} color="#0A1931" weight="bold" />
            </Pressable>
            <Text style={styles.navTitle}>Score breakdown</Text>
          </View>

          {/* Screen Headline & Subtitle */}
          <View style={styles.headlineSection}>
            <Text style={styles.headline}>Every point, explained</Text>
            <Text style={styles.subtitle}>
              Same five categories for everyone. No manual changes.
            </Text>
          </View>

          {/* 5 Category Cards */}
          <View style={styles.cardsList}>
            {/* Card 1: Education */}
            <View style={styles.categoryCard}>
              <View style={styles.cardHeaderRow}>
                <GraduationCap size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.categoryTitle}>Education</Text>
                <Text style={styles.scoreText}>
                  72<Text style={styles.scoreMax}>/100</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.fillNavy, { width: '72%' }]} />
              </View>

              <Text style={styles.explanationText}>
                Degree finished, marks above average for your field.
              </Text>
            </View>

            {/* Card 2: Skills */}
            <View style={styles.categoryCard}>
              <View style={styles.cardHeaderRow}>
                <Wrench size={20} color="#5E4DB2" weight="duotone" />
                <Text style={styles.categoryTitle}>Skills</Text>
                <Text style={[styles.scoreText, styles.textIndigo]}>
                  48<Text style={styles.scoreMax}>/100</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.fillIndigo, { width: '48%' }]} />
              </View>

              <Text style={[styles.explanationText, styles.textIndigo]}>
                3 skills listed. Lab roles in Pune usually ask for 6 or more.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.actionPillButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => onActionPress && onActionPress('add_lab_tools')}
              >
                <View style={styles.actionLeftRow}>
                  <Plus size={13} color="#0A1931" weight="bold" />
                  <Text style={styles.actionLabelText}>Add the lab tools you used</Text>
                </View>
                <Text style={styles.actionGainText}>+26</Text>
              </Pressable>
            </View>

            {/* Card 3: Experience */}
            <View style={styles.categoryCard}>
              <View style={styles.cardHeaderRow}>
                <Briefcase size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.categoryTitle}>Experience</Text>
                <Text style={styles.scoreText}>
                  15<Text style={styles.scoreMax}>/100</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.fillIndigo, { width: '15%' }]} />
              </View>

              <Text style={styles.explanationText}>
                One internship. Normal for a fresher, and the category that grows fastest.
              </Text>
            </View>

            {/* Card 4: Projects */}
            <View style={styles.categoryCard}>
              <View style={styles.cardHeaderRow}>
                <Flask size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.categoryTitle}>Projects</Text>
                <Text style={styles.scoreText}>
                  55<Text style={styles.scoreMax}>/100</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.fillIndigo, { width: '55%' }]} />
              </View>

              <Text style={styles.explanationText}>
                Two projects, neither with a result or a number attached.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.actionPillButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => onActionPress && onActionPress('project_number')}
              >
                <View style={styles.actionLeftRow}>
                  <Plus size={13} color="#0A1931" weight="bold" />
                  <Text style={styles.actionLabelText}>Put a number on a project</Text>
                </View>
                <Text style={styles.actionGainText}>+20</Text>
              </Pressable>
            </View>

            {/* Card 5: Presentation */}
            <View style={styles.categoryCard}>
              <View style={styles.cardHeaderRow}>
                <TextAa size={20} color="#0A1931" weight="duotone" />
                <Text style={styles.categoryTitle}>Presentation</Text>
                <Text style={styles.scoreText}>
                  66<Text style={styles.scoreMax}>/100</Text>
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.fillNavy, { width: '66%' }]} />
              </View>

              <Text style={styles.explanationText}>
                Clear layout. Two spelling mistakes found.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.actionPillButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => onActionPress && onActionPress('correct_spellings')}
              >
                <View style={styles.actionLeftRow}>
                  <PencilLine size={13} color="#0A1931" weight="bold" />
                  <Text style={styles.actionLabelText}>Correct two spellings</Text>
                </View>
                <Text style={styles.actionGainText}>+12</Text>
              </Pressable>
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNoteText}>
              Add-ons never change these five numbers
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
    backgroundColor: Colors.offWhite, // #FFFCF7
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg, // 20px
  },
  scrollContent: {
    paddingTop: Spacing.md, // 12px
    paddingBottom: Spacing.xxl, // 40px
    gap: Spacing.lg, // 20px
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md, // 12px
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E0D4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  navTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  headlineSection: {
    gap: 4,
  },
  headline: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: Colors.navy, // #0A1931
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary, // #3A4761
  },
  cardsList: {
    gap: Spacing.base, // 16px
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    padding: Spacing.base, // 16px
    gap: Spacing.md, // 12px
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md, // 12px
  },
  categoryTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Bold',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: Colors.navy, // #0A1931
  },
  scoreText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  textIndigo: {
    color: Colors.indigo, // #5E4DB2
  },
  scoreMax: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
    fontWeight: '400',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(94, 77, 178, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  fillNavy: {
    backgroundColor: '#5F4DB2', // #5F4DB2 matching BharatPath R_26Aug2026.dc.html
  },
  fillIndigo: {
    backgroundColor: '#5E4DB2',
  },
  explanationText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#0A1931',
  },
  actionPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#0A1931',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.pill, // 999
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  actionLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionLabelText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#0A1931',
  },
  actionGainText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#0A1931',
  },
  footerNoteText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
    textAlign: 'center',
    marginTop: 4,
  },
});
