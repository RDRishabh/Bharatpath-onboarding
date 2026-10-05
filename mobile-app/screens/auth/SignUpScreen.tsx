import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  User,
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  WarningCircle,
  ShieldCheck,
} from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { signUpWithEmail } from '@/services/api/auth';
import { ApiError } from '@/services/api/client';
import { useAuthContext } from '@/context/AuthContext';

export interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignUpScreenProps {
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  onSubmit?: (data: SignUpFormData, isUnconfirmed?: boolean) => void;
}

export function SignUpScreen({
  onBack,
  onNavigateToLogin,
  onSubmit,
}: SignUpScreenProps) {
  const { rememberCandidate } = useAuthContext();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Explicit input refs for clean, controlled keyboard navigation
  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Validation rules according to backend invariants:
  // - full_name: 1-100 chars, letters, spaces, . ' - only, no digits or @
  // - password: min 8 chars, letters and numbers
  const validate = (): boolean => {
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return false;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Full name cannot exceed 100 characters.');
      return false;
    }
    const nameRegex = /^[a-zA-Z\s\.\'\-]+$/;
    if (!nameRegex.test(trimmedName)) {
      setErrorMsg('Full name can only contain letters, spaces, dots, hyphens, and apostrophes (no digits or @).');
      return false;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return false;
    }

    if (password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return false;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorMsg('Password must include uppercase, lowercase, numbers, and special characters (!@#$%^&*).');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return false;
    }

    return true;
  };

  const getPasswordInlineError = (pass: string) => {
    if (pass.length === 0) return null;
    if (pass.length < 12) return 'Password must be at least 12 characters long.';
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return 'Password must include uppercase, lowercase, numbers, and special characters (!@#$%^&*).';
    }
    return null;
  };

  const passwordInlineError = getPasswordInlineError(password);

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signUpWithEmail({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if ('unconfirmed' in result && result.unconfirmed) {
        if (onSubmit) {
          onSubmit({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            confirmPassword,
          }, true);
        }
        return;
      }

      rememberCandidate(result as any, { full_name: fullName.trim(), city: null, state_code: null, updated_at: null }, fullName.trim());

      if (onSubmit) {
        onSubmit({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
        }, false);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'user_not_confirmed') {
        if (onSubmit) {
          onSubmit({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            confirmPassword,
          }, true);
          return;
        }
      }
      console.error('[SignUp Error]:', err);
      if (err instanceof ApiError) {
        if (err.code === 'account_contact_in_use') {
          setErrorMsg('An account with this email already exists. Please sign in instead.');
        } else if (err.code === 'network_error') {
          setErrorMsg('Cannot reach backend server. Please verify your internet connection.');
        } else {
          setErrorMsg(err.problem?.title || err.message || 'Failed to create account.');
        }
      } else {
        setErrorMsg(err?.message || 'Failed to create account. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormFilled =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    confirmPassword.length >= 12;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
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
              <ArrowLeft size={18} color={Colors.navy} weight="bold" />
            </Pressable>
            <Text style={styles.navTitle}>Create Account</Text>
            <View style={styles.navPlaceholder} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header / Intro */}
            <View style={styles.headerSection}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <ShieldCheck size={14} color={Colors.brandAccent} weight="bold" />
                  <Text style={styles.badgeText}>CANDIDATE SIGNUP</Text>
                </View>
              </View>
              <Text style={styles.title}>Start your career journey</Text>
              <Text style={styles.subtitle}>
                Create an account to evaluate your resume, discover matching jobs, and get recruited.
              </Text>
            </View>

            {/* Error Message Box */}
            {errorMsg ? (
              <View style={styles.errorContainer}>
                <WarningCircle size={18} color={Colors.red.fg} weight="fill" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'fullName' && styles.inputWrapperFocused,
                  ]}
                >
                  <User
                    size={20}
                    color={focusedField === 'fullName' ? Colors.brandAccent : Colors.text.muted}
                  />
                  <TextInput
                    ref={fullNameRef}
                    style={styles.textInput}
                    placeholder="e.g. Priya Sharma"
                    placeholderTextColor={Colors.text.muted}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    editable={!isLoading}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    textContentType="name"
                    autoComplete="name"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Only letters and spaces. Stored in profile upon signup.
                </Text>
              </View>

              {/* Email Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <EnvelopeSimple
                    size={20}
                    color={focusedField === 'email' ? Colors.brandAccent : Colors.text.muted}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.textInput}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.text.muted}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    textContentType="emailAddress"
                    autoComplete="email"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Used to verify your identity and send notification updates.
                </Text>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock
                    size={20}
                    color={focusedField === 'password' ? Colors.brandAccent : Colors.text.muted}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.textInput}
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.text.muted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeSlash size={20} color={Colors.text.muted} />
                    ) : (
                      <Eye size={20} color={Colors.text.muted} />
                    )}
                  </Pressable>
                </View>
                {password.length > 0 && passwordInlineError ? (
                  <Text style={[styles.inputHint, { color: Colors.red.fg }]}>
                    {passwordInlineError}
                  </Text>
                ) : (
                  <Text style={styles.inputHint}>
                    Must be at least 12 characters with uppercase, lowercase, number & symbol.
                  </Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock
                    size={20}
                    color={focusedField === 'confirmPassword' ? Colors.brandAccent : Colors.text.muted}
                  />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.textInput}
                    placeholder="Re-enter your password"
                    placeholderTextColor={Colors.text.muted}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    blurOnSubmit={true}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <EyeSlash size={20} color={Colors.text.muted} />
                    ) : (
                      <Eye size={20} color={Colors.text.muted} />
                    )}
                  </Pressable>
                </View>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <Text style={[styles.inputHint, { color: Colors.red.fg }]}>
                    Passwords do not match.
                  </Text>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!isFormFilled || isLoading) && styles.primaryButtonDisabled,
                pressed && isFormFilled && !isLoading && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!isFormFilled || isLoading}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>

            {/* Bottom Switch Link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <Pressable onPress={onNavigateToLogin} hitSlop={8} disabled={isLoading}>
                <Text style={styles.switchLink}>Sign In</Text>
              </Pressable>
            </View>

            {/* Legal / DPDP Notice */}
            <View style={styles.legalSection}>
              <Text style={styles.legalText}>
                By creating an account, you agree to BharatPath's Terms of Service and Privacy Policy. Your data is protected in accordance with the Digital Personal Data Protection (DPDP) Act.
              </Text>
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
    backgroundColor: Colors.offWhite,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.hairline,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: Colors.navy,
  },
  navPlaceholder: {
    width: 40,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  headerSection: {
    gap: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.indigoSemantic.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: Colors.brandAccent,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Colors.navy,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.red.bg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radii.tile,
    borderWidth: 1,
    borderColor: '#E8B6AB',
  },
  errorText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.red.fg,
  },
  form: {
    gap: Spacing.base,
  },
  inputGroup: {
    gap: Spacing.opt6,
  },
  inputLabel: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: Colors.navy,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface.card,
    borderWidth: 1.5,
    borderColor: Colors.surface.border,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.base,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.brandAccent,
  },
  textInput: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    color: Colors.navy,
    height: '100%',
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  inputHint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
    paddingHorizontal: 2,
  },
  primaryButton: {
    backgroundColor: Colors.brandAccent,
    height: 54,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: Colors.brandAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C5BFDF',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  switchText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    color: Colors.text.primary,
  },
  switchLink: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    color: Colors.brandAccent,
  },
  legalSection: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.hairline,
  },
  legalText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: Colors.text.muted,
    textAlign: 'center',
  },
});
