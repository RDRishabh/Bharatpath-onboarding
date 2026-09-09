import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/theme/tokens';

interface SplashScreenProps {
  onFinish?: () => void;
  autoPlay?: boolean;
}

export function SplashScreen({ onFinish, autoPlay = true }: SplashScreenProps) {
  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;

  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkWidth = useRef(new Animated.Value(0)).current;
  const wordmarkMargin = useRef(new Animated.Value(0)).current;

  const ruleOpacity = useRef(new Animated.Value(0)).current;
  const ruleWidth = useRef(new Animated.Value(0)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;

  const finishedRef = useRef(false);

  const finishCallback = () => {
    if (!finishedRef.current) {
      finishedRef.current = true;
      if (onFinish) {
        onFinish();
      }
    }
  };

  useEffect(() => {
    const easeOutCubic = Easing.bezier(0.16, 0.6, 0.15, 1);

    // Multi-phase sequence matching HTML handoff timings:
    // Phase 1 (80ms): Logo mark scale & fade in
    // Phase 2 (800ms): Wordmark expands out next to logo
    // Phase 3 (2000ms): Gold line expands
    // Phase 4 (2480ms): Tagline slides up & fades in

    const animSequence = Animated.sequence([
      // Delay initial 80ms
      Animated.delay(80),

      // Phase 1: Logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 720,
          easing: easeOutCubic,
          useNativeDriver: false,
        }),
      ]),

      // Delay to 800ms mark
      Animated.delay(100),

      // Phase 2: Wordmark
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(wordmarkWidth, {
          toValue: 160,
          duration: 1100,
          easing: easeOutCubic,
          useNativeDriver: false,
        }),
        Animated.timing(wordmarkMargin, {
          toValue: 12,
          duration: 1100,
          easing: easeOutCubic,
          useNativeDriver: false,
        }),
      ]),

      // Delay to 2000ms mark
      Animated.delay(200),

      // Phase 3: Gold Rule
      Animated.parallel([
        Animated.timing(ruleOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(ruleWidth, {
          toValue: 44,
          duration: 500,
          easing: easeOutCubic,
          useNativeDriver: false,
        }),
      ]),

      // Delay to 2480ms mark
      Animated.delay(130),

      // Phase 4: Tagline
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ]),

      // Hold after tagline before triggering finish
      Animated.delay(900),
    ]);

    animSequence.start(({ finished }) => {
      if (finished && autoPlay) {
        finishCallback();
      }
    });

    return () => {
      animSequence.stop();
    };
  }, []);

  const handleSkip = () => {
    finishCallback();
  };

  return (
    <Pressable style={styles.container} onPress={handleSkip}>
      <StatusBar style="light" animated />
      <View style={styles.centerContent}>
        {/* Brand Row: Logo Mark + Wordmark */}
        <View style={styles.brandRow}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../../assets/icons/bp-logo-mark.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.wordmarkContainer,
              {
                opacity: wordmarkOpacity,
                maxWidth: wordmarkWidth,
                marginLeft: wordmarkMargin,
              },
            ]}
          >
            <Text style={styles.wordmarkText} numberOfLines={1}>
              BharatPath
            </Text>
          </Animated.View>
        </View>

        {/* Horizontal Gold Rule */}
        <Animated.View
          style={[
            styles.goldRule,
            {
              opacity: ruleOpacity,
              width: ruleWidth,
            },
          ]}
        />

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={styles.taglineText}>Find your best fit</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy, // #0A1931
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 44,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 44,
    height: 38,
  },
  wordmarkContainer: {
    overflow: 'hidden',
  },
  wordmarkText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  goldRule: {
    height: 2,
    borderRadius: 2,
    backgroundColor: '#D4AF37', // Gold accent
    marginTop: 20,
  },
  taglineText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.64,
    color: '#D4AF37',
    marginTop: 14,
    textAlign: 'center',
  },
});
