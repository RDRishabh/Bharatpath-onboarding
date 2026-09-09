import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Wrench, Flask, TextAa, Plus } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface SuggestionsScreenProps {
  onBack?: () => void;
  onAddSkills?: () => void;
  onEditProject?: () => void;
  onFixSpellings?: () => void;
}

export function SuggestionsScreen({
  onBack,
  onAddSkills,
  onEditProject,
  onFixSpellings,
}: SuggestionsScreenProps) {
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
            <Text style={styles.navTitle}>Raise my score</Text>
          </View>

          {/* Screen Headline & Subtitle */}
          <View style={styles.headlineSection}>
            <Text style={styles.headline}>Three fixes, biggest first</Text>
            <Text style={styles.subtitle}>
              Do all three and you gain about{' '}
              <Text style={styles.highlightGain}>+58 points</Text>.
            </Text>
          </View>

          {/* 3 Fix Cards */}
          <View style={styles.cardsList}>
            {/* Card 1: FIX 01 · SKILLS */}
            <View style={styles.fixCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconSquare}>
                  <Wrench size={16} color="#D4AF37" weight="bold" />
                </View>
                <Text style={styles.eyebrowText}>FIX 01 · SKILLS</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>+26</Text>
                </View>
              </View>

              <View style={styles.cardContentSection}>
                <Text style={styles.cardTitle}>
                  Add the lab tools you have actually used
                </Text>
                <Text style={styles.cardDescription}>
                  Autoclave, spectrophotometer, LIMS entry. Employers hiring lab
                  roles in Pune filter on exactly these.
                </Text>
              </View>

              <View style={styles.chipsWrapRow}>
                <View style={styles.toolChip}>
                  <Plus size={12} color="#0A1931" weight="bold" />
                  <Text style={styles.toolChipText}>Autoclave</Text>
                </View>
                <View style={styles.toolChip}>
                  <Plus size={12} color="#0A1931" weight="bold" />
                  <Text style={styles.toolChipText}>Spectrophotometer</Text>
                </View>
                <View style={styles.toolChip}>
                  <Plus size={12} color="#0A1931" weight="bold" />
                  <Text style={styles.toolChipText}>LIMS</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryCtaButton,
                  pressed && styles.primaryPressed,
                ]}
                onPress={onAddSkills}
              >
                <Text style={styles.primaryCtaText}>Add these three skills</Text>
              </Pressable>
            </View>

            {/* Card 2: FIX 02 · PROJECTS */}
            <View style={styles.fixCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconSquare}>
                  <Flask size={16} color="#D4AF37" weight="bold" />
                </View>
                <Text style={styles.eyebrowText}>FIX 02 · PROJECTS</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>+20</Text>
                </View>
              </View>

              <View style={styles.cardContentSection}>
                <Text style={styles.cardTitle}>Put a number on your project</Text>
                <Text style={styles.cardDescription}>
                  "Tested 40 water samples over 6 weeks" counts for far more than
                  "water testing project".
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.outlineCtaButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onEditProject}
              >
                <Text style={styles.outlineCtaText}>Edit this project</Text>
              </Pressable>
            </View>

            {/* Card 3: FIX 03 · PRESENTATION */}
            <View style={styles.fixCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconSquare}>
                  <TextAa size={16} color="#D4AF37" weight="bold" />
                </View>
                <Text style={styles.eyebrowText}>FIX 03 · PRESENTATION</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>+12</Text>
                </View>
              </View>

              <View style={styles.cardContentSection}>
                <Text style={styles.cardTitle}>Correct two spellings</Text>
                <Text style={styles.cardDescription}>
                  "MS-Ofice" and "Teem work" are still flagged in your skills.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.outlineCtaButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onFixSpellings}
              >
                <Text style={styles.outlineCtaText}>Fix both spellings</Text>
              </Pressable>
            </View>
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
  highlightGain: {
    fontFamily: 'GeneralSans-Bold',
    color: Colors.navy, // #0A1931
  },
  cardsList: {
    gap: Spacing.base, // 16px
  },
  fixCard: {
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
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowText: {
    flex: 1,
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.1,
    color: '#5F6B80',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  scoreBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.navy, // #0A1931
  },
  cardContentSection: {
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: Colors.navy, // #0A1931
  },
  cardDescription: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary, // #3A4761
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm, // 8px
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#F4EFE4',
  },
  toolChipText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.navy, // #0A1931
  },
  primaryCtaButton: {
    width: '100%',
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 16,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryCtaText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.offWhite,
  },
  outlineCtaButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.navy, // #0A1931
    paddingVertical: 16,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  outlineCtaText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
});
