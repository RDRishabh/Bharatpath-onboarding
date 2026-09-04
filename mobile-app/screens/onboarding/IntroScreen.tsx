import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radii, Spacing } from '@/theme/tokens';

interface IntroScreenProps {
  onGetStarted?: () => void;
  onAlreadyHaveAccount?: () => void;
}

export function IntroScreen({ onGetStarted, onAlreadyHaveAccount }: IntroScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.content}>
          {/* Hero Illustration */}
          <View style={styles.imageWrapper}>
            <Image
              source={require('../../assets/icons/intro-hero.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Text Section */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Find out how strong your resume is!
            </Text>
            <Text style={styles.subtitle}>
              Get a score that shows how your resume stands out to recruiters and where you can improve.
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onGetStarted}
          >
            <Text style={styles.primaryButtonText}>Get started free</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
            onPress={onAlreadyHaveAccount}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
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
    paddingHorizontal: Spacing.xl, // 24px
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: Colors.navy, // #0A1931
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  actionsContainer: {
    gap: Spacing.opt10, // 10px
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.base,
  },
  primaryButton: {
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
  primaryButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.offWhite,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary, // #3A4761
    fontWeight: '500',
  },
});
