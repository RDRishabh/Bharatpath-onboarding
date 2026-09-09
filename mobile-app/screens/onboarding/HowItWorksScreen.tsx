import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface HowItWorksScreenProps {
  onGotIt?: () => void;
  onBack?: () => void;
}

export function HowItWorksScreen({ onGotIt, onBack }: HowItWorksScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step Progress Header */}
          <View style={styles.headerProgressSection}>
            <Text style={styles.stepEyebrow}>STEP 2 OF 3</Text>
            <View style={styles.progressSegmentsRow}>
              <View style={[styles.progressSegment, styles.segmentActive]} />
              <View style={[styles.progressSegment, styles.segmentActive]} />
              <View style={[styles.progressSegment, styles.segmentInactive]} />
            </View>
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Three steps, that's all</Text>
            <Text style={styles.subtitle}>
              Give us your resume, check what we read, then see your score.
            </Text>
          </View>

          {/* Cards Section */}
          <View style={styles.cardsList}>
            {/* Card 1 */}
            <View style={styles.stepCard}>
              <View style={styles.cardInfo}>
                <View style={styles.badgeRow}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.badgeText}>1</Text>
                  </View>
                  <Text style={styles.stepTitleLabel}>STEP ONE</Text>
                </View>
                <Text style={styles.cardTitle}>Give us your resume</Text>
                <Text style={styles.cardBody}>
                  A file, pasted text, or fill a short form if you don't have one yet.
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/how-1.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>

            {/* Card 2 */}
            <View style={styles.stepCard}>
              <View style={styles.cardInfo}>
                <View style={styles.badgeRow}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
                  <Text style={styles.stepTitleLabel}>STEP TWO</Text>
                </View>
                <Text style={styles.cardTitle}>Check what we read</Text>
                <Text style={styles.cardBody}>
                  You correct anything wrong before it counts. Nothing is scored behind your back.
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/how-2.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>

            {/* Card 3 */}
            <View style={styles.stepCard}>
              <View style={styles.cardInfo}>
                <View style={styles.badgeRow}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.badgeText}>3</Text>
                  </View>
                  <Text style={styles.stepTitleLabel}>STEP THREE</Text>
                </View>
                <Text style={styles.cardTitle}>Get your score and gaps</Text>
                <Text style={styles.cardBody}>
                  Five categories, each explained, with the fixes worth the most points.
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/how-3.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions Row */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gotItButton,
              pressed && styles.gotItPressed,
            ]}
            onPress={onGotIt}
          >
            <Text style={styles.gotItButtonText}>Got it</Text>
          </Pressable>
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
  },
  scrollContent: {
    paddingTop: Spacing.xl, // 24px
    paddingBottom: Spacing.xl, // 24px
    gap: Spacing.xl, // 24px
  },
  headerProgressSection: {
    gap: Spacing.sm, // 8px
  },
  stepEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.3,
    color: '#5F6B80',
  },
  progressSegmentsRow: {
    flexDirection: 'row',
    gap: Spacing.opt6, // 6px
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radii.pill, // 999
  },
  segmentActive: {
    backgroundColor: Colors.navy, // #0A1931
  },
  segmentInactive: {
    backgroundColor: '#E7E0D4',
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75,
    color: Colors.navy, // #0A1931
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
  },
  cardsList: {
    gap: Spacing.md, // 12px
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 8px
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 11,
    color: Colors.gold, // #D4AF37 / #F4D685
  },
  stepTitleLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.3,
    color: '#566073',
  },
  cardTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.4,
    color: Colors.navy, // #0A1931
  },
  cardBody: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text.primary, // #3A4761
  },
  cardImage: {
    width: 76,
    height: 76,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm, // 8px
    paddingVertical: Spacing.base, // 16px
    backgroundColor: Colors.offWhite,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  backButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  gotItButton: {
    flex: 2,
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  gotItButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.offWhite,
  },
});
