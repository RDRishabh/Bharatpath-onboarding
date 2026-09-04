import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Phone, EnvelopeSimple } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

export interface CreateAccountScreenProps {
  score?: number;
  bandName?: string;
  bandNumber?: number;
  bandTotal?: number;
  initialPhone?: string;
  onBack?: () => void;
  onSendCode?: (phoneNumber: string) => void;
  onGoogleAuth?: () => void;
  onEmailAuth?: () => void;
}

export function CreateAccountScreen({
  score = 706,
  bandName = 'Emerging',
  bandNumber = 1,
  bandTotal = 4,
  initialPhone = '',
  onBack,
  onSendCode,
  onGoogleAuth,
  onEmailAuth,
}: CreateAccountScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Format phone number with a space after 5 digits (e.g. "98765 43210")
  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length > 5) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
  };

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
  };

  const rawDigits = phoneNumber.replace(/\D/g, '');
  const formattedDisplay = formatPhoneNumber(rawDigits);
  const digitCount = rawDigits.length;

  const handleSendCode = () => {
    if (onSendCode) {
      onSendCode(rawDigits);
    }
  };

  const handleCardPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={16} color={Colors.navy} weight="bold" />
              </Pressable>
              <Text style={styles.navTitle}>Create account</Text>
            </View>

            {/* Score & Band Header Card - Clean solid deep navy */}
            <View style={styles.scoreCard}>
              {/* Left Score Column */}
              <View style={styles.scoreCol}>
                <Text style={styles.scoreText}>{score}</Text>
                <Text style={styles.outOfText}>OUT OF 999</Text>
              </View>

              {/* Vertical Divider */}
              <View style={styles.scoreDivider} />

              {/* Right Band Status Column */}
              <View style={styles.bandCol}>
                <View style={styles.bandBadgeRow}>
                  <Text style={styles.bandTitle}>{bandName}</Text>
                  <View style={styles.bandBadge}>
                    <Text style={styles.bandBadgeText}>
                      BAND {bandNumber} OF {bandTotal}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bandSubtitle}>Verify to keep this score.</Text>
              </View>
            </View>

            {/* Headline & Subtitle */}
            <View style={styles.headingSection}>
              <Text style={styles.title}>Your phone number</Text>
              <Text style={styles.subtitle}>
                We send a 6-digit code. No password to remember.
              </Text>
            </View>

            {/* Phone Number Input Box - Tapping anywhere opens keyboard */}
            <Pressable
              style={[
                styles.inputCard,
                isFocused && styles.inputCardFocused,
              ]}
              onPress={handleCardPress}
            >
              <Phone size={18} color="#3A4761" weight="bold" />
              <Text style={styles.countryCode}>+91</Text>
              <View style={styles.inputSeparator} />

              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={formattedDisplay}
                onChangeText={handleChangeText}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="98765 43210"
                placeholderTextColor="#9DA9BE"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                maxLength={11} // 10 digits + 1 space
                selectionColor={Colors.navy}
                editable={true}
                autoFocus={false}
              />

              <Text style={styles.counterText}>
                {digitCount} / 10
              </Text>
            </Pressable>

            {/* Primary Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.sendCodeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSendCode}
              accessibilityRole="button"
            >
              <Text style={styles.sendCodeText}>Send code</Text>
            </Pressable>

            {/* "or" Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social & Alternative Auth Options */}
            <View style={styles.altButtonsContainer}>
              {/* Google Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.altButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onGoogleAuth}
                accessibilityRole="button"
              >
                <Image
                  source={require('../../assets/icons/google.png')}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
                <Text style={styles.altButtonText}>Continue with Google</Text>
              </Pressable>

              {/* Email Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.altButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onEmailAuth}
                accessibilityRole="button"
              >
                <EnvelopeSimple size={18} color={Colors.navy} weight="bold" />
                <Text style={styles.altButtonText}>Use email instead</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg, // 20px
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
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  navTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
    fontWeight: '600',
    flex: 1,
  },
  scoreCard: {
    backgroundColor: Colors.navy, // #0A1931
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scoreText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1.2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  outOfText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.4,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  scoreDivider: {
    width: 1,
    height: 46,
    backgroundColor: 'rgba(255, 252, 247, 0.16)',
  },
  bandCol: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  bandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bandTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(244, 214, 133, 0.16)',
  },
  bandBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.0,
    color: '#F4D685',
    fontWeight: '700',
  },
  bandSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.mutedOnNavy, // #9DA9BE
  },
  headingSection: {
    gap: 4,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: Colors.navy, // #0A1931
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A1931',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  inputCardFocused: {
    borderColor: Colors.navy,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  countryCode: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 17,
    lineHeight: 24,
    color: Colors.text.primary, // #3A4761
    fontWeight: '600',
  },
  inputSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E7E0D4',
  },
  textInput: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 17,
    lineHeight: 24,
    color: Colors.navy,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingVertical: 4,
    minHeight: 40,
  },
  counterText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  sendCodeButton: {
    width: '100%',
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E7E0D4',
  },
  orText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  altButtonsContainer: {
    gap: 8,
  },
  altButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 16,
    borderRadius: Radii.pill, // 999
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  altButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
    fontWeight: '600',
  },
});
