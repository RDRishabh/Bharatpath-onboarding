/**
 * BharatPath — JobDetailScreen
 *
 * Implements S18 (Job detail) from `docs/screen-flows.md`, wired to the real
 * backend `GET /candidate/jobs/{id}` and `POST /candidate/applications`.
 *
 * ONE state-driven screen keyed on `eligibility` + `alreadyApplied`. The top
 * panel and bottom CTA vary by eligibility; everything else is shared.
 *
 * Key rules enforced here (R11 / invariants):
 *  - NO score benchmark slider, NO "+26"/"−14" delta pills, NO "ONE FIX
 *    CLOSES THE GAP" card. The score is never explained.
 *  - ELIGIBLE → "You can apply to this job" + "Apply with my profile" CTA.
 *  - BELOW_THRESHOLD → "Not eligible for this job yet" (neutral, not red) +
 *    "Keep looking" CTA (no apply).
 *  - SCORE_PENDING → "We're still reading your resume" + disabled CTA.
 *  - Already applied → "You've applied" state, no second apply.
 *  - Apply sheet → POST /candidate/applications with full error handling:
 *      403 → re-render as not eligible
 *      409 score_pending → "We're still reading your resume"
 *      409 application_unavailable → "This job isn't open to applications"
 *      404 → back to feed
 *      402 → paywall (subscription required)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookmarkSimple,
  ShareNetwork,
  SealCheck,
  CheckCircle,
  CurrencyInr,
  Clock,
  MapPin,
  Check,
  EyeSlash,
  XCircle,
  SpinnerGap,
  Briefcase,
  Sparkle,
  Bell,
} from 'phosphor-react-native';
import { Colors } from '@/theme/tokens';
import { BoardJobDetail, EligibilityStatus } from '@/types/job';
import {
  formatSalaryRangePaise,
  formatExperienceMonths,
  workModeLabel,
  getInitials,
} from '@/utils/helpers';
import {
  applyToJob,
  applyErrorMessage,
  isEligibilityError,
  isJobGoneError,
} from '@/services/api/jobs';
import { ApiError } from '@/services/api/client';

// Text strings extracted as constants so the JSX contains no literal
// apostrophes (react/no-unescaped-entities).
const TXT_APPLIED_TITLE = "You've applied to this job";
const TXT_APPLIED_SUB =
  "The employer will see your profile. You'll hear back on the Application Board.";
const TXT_ELIGIBLE_TITLE = 'You can apply to this job';
const TXT_ELIGIBLE_SUB =
  'One tap with your profile — no forms, no cover letter.';
const TXT_BELOW_TITLE = 'Not eligible for this job yet';
const TXT_BELOW_SUB =
  'Keep building your profile and check back. You can still see the details.';
const TXT_PENDING_TITLE = "We're still reading your resume";
const TXT_PENDING_SUB =
  "Once your score is ready we'll tell you whether you can apply.";
const TXT_APPLIED_CTA_SUB = 'See it on your Application Board';
const TXT_BELOW_CTA_SUB = 'There are other jobs that fit your profile';
const TXT_PENDING_CTA_SUB = "We'll notify you";
const TXT_APPLY_CTA_SUB = 'One tap · no forms, no cover letter';
const TXT_PRIVACY =
  'Your name and number stay hidden until this employer unlocks your profile. You get told when they do.';

export interface JobDetailScreenProps {
  /** Full job detail from GET /candidate/jobs/{id}. */
  job: BoardJobDetail;
  /** True if the candidate already has an application for this job. */
  alreadyApplied?: boolean;
  onBack?: () => void;
  /** Called after a successful apply, with the employer name. */
  onApplied?: (employerName: string) => void;
  onBookmark?: () => void;
  onShare?: () => void;
  /** Called when the job is gone (404) — usually navigate back. */
  onJobGone?: () => void;
  /** Called when subscription is required (402). */
  onSubscriptionRequired?: () => void;
}

type ApplyState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export function JobDetailScreen({
  job,
  alreadyApplied = false,
  onBack,
  onApplied,
  onBookmark,
  onShare,
  onJobGone,
  onSubscriptionRequired,
}: JobDetailScreenProps) {
  // Local eligibility can flip to BELOW_THRESHOLD if the apply returns 403.
  const [eligibility, setEligibility] = useState<EligibilityStatus>(
    job.eligibility,
  );
  const [applied, setApplied] = useState<boolean>(alreadyApplied);
  const [applyState, setApplyState] = useState<ApplyState>({ kind: 'idle' });

  const employerName = job.employer_name || 'Employer';
  const initials = getInitials(employerName);

  const handleApply = useCallback(async () => {
    if (applyState.kind === 'submitting' || applied) return;
    setApplyState({ kind: 'submitting' });
    try {
      await applyToJob(job.id);
      setApplied(true);
      setApplyState({ kind: 'done' });
      onApplied?.(employerName);
    } catch (err) {
      if (isJobGoneError(err)) {
        setApplyState({
          kind: 'error',
          message: 'This job is no longer open.',
        });
        onJobGone?.();
        return;
      }
      if (err instanceof ApiError && err.status === 402) {
        setApplyState({
          kind: 'error',
          message: 'A membership is required to apply.',
        });
        onSubscriptionRequired?.();
        return;
      }
      if (isEligibilityError(err)) {
        // 403 → re-render as not eligible.
        setEligibility('BELOW_THRESHOLD');
        setApplyState({ kind: 'idle' });
        return;
      }
      const message = applyErrorMessage(
        err,
        'We could not submit your application. Try again.',
      );
      setApplyState({ kind: 'error', message });
    }
  }, [
    applyState.kind,
    applied,
    job.id,
    onApplied,
    employerName,
    onJobGone,
    onSubscriptionRequired,
  ]);

  const handleBookmark = () => {
    onBookmark?.();
    Alert.alert('Job Saved', `${job.title} saved to your bookmarks.`);
  };

  const handleShare = () => {
    onShare?.();
    Alert.alert('Share Job', `Sharing ${job.title} at ${employerName}.`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" animated />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dark Navy Hero Section */}
        <View style={styles.navyHero}>
          <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
            {/* Top Bar Actions */}
            <View style={styles.topNavRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.navCircleBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to jobs"
              >
                <ArrowLeft size={16} color="#FFFFFF" weight="bold" />
              </Pressable>

              <View style={styles.navRightActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.navCircleBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleBookmark}
                  accessibilityRole="button"
                  accessibilityLabel="Save job"
                >
                  <BookmarkSimple size={17} color="#FFFFFF" weight="bold" />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.navCircleBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share job"
                >
                  <ShareNetwork size={17} color="#FFFFFF" weight="bold" />
                </Pressable>
              </View>
            </View>

            {/* Role & Company Header */}
            <View style={styles.roleHeaderRow}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>{initials}</Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitleText}>{job.title}</Text>
                <View style={styles.companySubRow}>
                  <Text style={styles.companyNameText}>{employerName}</Text>
                  <SealCheck size={14} color="#FFFCF7" weight="fill" />
                  <Text style={styles.verifiedLabelText}>Verified</Text>
                </View>
              </View>
            </View>

            {/* Eligibility panel — varies by eligibility */}
            <EligibilityPanel eligibility={eligibility} applied={applied} />
          </SafeAreaView>
        </View>

        {/* White / Off-White Details Section */}
        <View style={styles.detailsBody}>
          {/* Metric cards */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <CurrencyInr size={17} color="#5E4DB2" weight="duotone" />
              <Text style={styles.metricLabel}>MONTHLY</Text>
              <Text style={styles.metricValueMono}>
                {formatSalaryRangePaise(
                  job.salary_min_minor,
                  job.salary_max_minor,
                )}
              </Text>
            </View>

            {job.work_mode ? (
              <View style={styles.metricCard}>
                <Briefcase size={17} color="#5F6B80" weight="duotone" />
                <Text style={styles.metricLabel}>WORK MODE</Text>
                <Text style={styles.metricValueSans}>
                  {workModeLabel(job.work_mode)}
                </Text>
              </View>
            ) : null}

            {job.experience_min_months ? (
              <View style={styles.metricCard}>
                <Clock size={17} color="#5F6B80" weight="duotone" />
                <Text style={styles.metricLabel}>EXPERIENCE</Text>
                <Text style={styles.metricValueSans}>
                  {formatExperienceMonths(job.experience_min_months)}
                </Text>
              </View>
            ) : null}

            {job.location ? (
              <View style={styles.metricCard}>
                <MapPin size={17} color="#5F6B80" weight="duotone" />
                <Text style={styles.metricLabel}>LOCATION</Text>
                <Text style={styles.metricValueSans} numberOfLines={1}>
                  {job.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* WHAT YOU WOULD DO */}
          {job.description ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionEyebrow}>WHAT YOU WOULD DO</Text>
              <Text style={styles.bodyDescription}>{job.description}</Text>
            </View>
          ) : null}

          {/* SKILLS THEY ASKED FOR */}
          {job.skills.length > 0 ? (
            <View style={styles.sectionBlock}>
              <View style={styles.skillsEyebrowRow}>
                <Text style={styles.sectionEyebrow}>SKILLS THEY ASKED FOR</Text>
              </View>
              <View style={styles.skillsChipsWrap}>
                {job.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Sparkle size={11} color="#5F6B80" weight="bold" />
                    <Text style={styles.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Privacy Protection Notice */}
          <View style={styles.privacyNoticeBox}>
            <EyeSlash size={17} color="#5F6B80" weight="bold" />
            <Text style={styles.privacyNoticeText}>{TXT_PRIVACY}</Text>
          </View>

          {/* Sticky Bottom CTA — varies by eligibility + applied */}
          <View style={styles.bottomCtaContainer}>
            <BottomCTA
              eligibility={eligibility}
              applied={applied}
              applyState={applyState}
              onApply={handleApply}
              onBack={onBack}
            />
            {applyState.kind === 'error' && (
              <Text style={styles.applyErrorText}>{applyState.message}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Eligibility Panel (top, inside navy hero) ─────────────────

interface EligibilityPanelProps {
  eligibility: EligibilityStatus;
  applied: boolean;
}

function EligibilityPanel({ eligibility, applied }: EligibilityPanelProps) {
  if (applied) {
    return (
      <View style={styles.scoreClearanceCard}>
        <View style={styles.clearanceHeaderRow}>
          <View style={styles.clearanceCheckCircle}>
            <Check size={8} color="#5F4DB2" weight="bold" />
          </View>
          <Text style={styles.clearanceTitleText}>{TXT_APPLIED_TITLE}</Text>
        </View>
        <Text style={styles.clearanceSubtext}>{TXT_APPLIED_SUB}</Text>
      </View>
    );
  }

  switch (eligibility) {
    case 'ELIGIBLE':
      return (
        <View style={styles.scoreClearanceCard}>
          <View style={styles.clearanceHeaderRow}>
            <View style={styles.clearanceCheckCircle}>
              <Check size={8} color="#5F4DB2" weight="bold" />
            </View>
            <Text style={styles.clearanceTitleText}>{TXT_ELIGIBLE_TITLE}</Text>
          </View>
          <Text style={styles.clearanceSubtext}>{TXT_ELIGIBLE_SUB}</Text>
        </View>
      );
    case 'BELOW_THRESHOLD':
      // Neutral, not red (R11 — never shame the score).
      return (
        <View style={styles.scoreClearanceCard}>
          <View style={styles.clearanceHeaderRow}>
            <View style={styles.clearanceCheckCircle}>
              <XCircle size={10} color="#9DA9BE" weight="bold" />
            </View>
            <Text style={styles.clearanceTitleText}>{TXT_BELOW_TITLE}</Text>
          </View>
          <Text style={styles.clearanceSubtext}>{TXT_BELOW_SUB}</Text>
        </View>
      );
    case 'SCORE_PENDING':
      return (
        <View style={styles.scoreClearanceCard}>
          <View style={styles.clearanceHeaderRow}>
            <View style={styles.clearanceCheckCircle}>
              <SpinnerGap size={10} color="#9DA9BE" weight="bold" />
            </View>
            <Text style={styles.clearanceTitleText}>{TXT_PENDING_TITLE}</Text>
          </View>
          <Text style={styles.clearanceSubtext}>{TXT_PENDING_SUB}</Text>
        </View>
      );
    default:
      return null;
  }
}

// ─── Bottom CTA (varies by eligibility + applied) ───────────────

interface BottomCTAProps {
  eligibility: EligibilityStatus;
  applied: boolean;
  applyState: ApplyState;
  onApply: () => void;
  onBack?: () => void;
}

function BottomCTA({
  eligibility,
  applied,
  applyState,
  onApply,
  onBack,
}: BottomCTAProps) {
  if (applied) {
    return (
      <>
        <View style={styles.appliedBtn}>
          <CheckCircle size={18} color="#FFFFFF" weight="fill" />
          <Text style={styles.applyBtnText}>Applied</Text>
        </View>
        <Text style={styles.applySubtext}>{TXT_APPLIED_CTA_SUB}</Text>
      </>
    );
  }

  if (eligibility === 'BELOW_THRESHOLD') {
    return (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.keepLookingBtn,
            pressed && styles.buttonPressed,
          ]}
          onPress={onBack}
          accessibilityRole="button"
        >
          <Text style={styles.keepLookingBtnText}>Keep looking</Text>
        </Pressable>
        <Text style={styles.applySubtext}>{TXT_BELOW_CTA_SUB}</Text>
      </>
    );
  }

  if (eligibility === 'SCORE_PENDING') {
    return (
      <>
        <View style={styles.disabledBtn}>
          <Bell size={17} color="#9DA9BE" weight="bold" />
          <Text style={styles.disabledBtnText}>
            Apply opens when score is ready
          </Text>
        </View>
        <Text style={styles.applySubtext}>{TXT_PENDING_CTA_SUB}</Text>
      </>
    );
  }

  // ELIGIBLE
  const submitting = applyState.kind === 'submitting';
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.applyBtn,
          pressed && styles.buttonPressed,
          submitting && styles.applyBtnSubmitting,
        ]}
        onPress={onApply}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Apply with my profile"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.applyBtnText}>Apply with my profile</Text>
        )}
      </Pressable>
      <Text style={styles.applySubtext}>{TXT_APPLY_CTA_SUB}</Text>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  navyHero: {
    backgroundColor: '#5F4DB2',
    paddingBottom: 28,
  },
  heroSafeArea: {
    paddingHorizontal: 20,
    gap: 18,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.26)',
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  companyBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 252, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 17,
    lineHeight: 20,
    color: '#FFFCF7',
  },
  roleInfo: {
    flex: 1,
    gap: 4,
  },
  roleTitleText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  companySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyNameText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#9DA9BE',
  },
  verifiedLabelText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 16,
    color: '#9DA9BE',
  },
  scoreClearanceCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.18)',
    gap: 10,
  },
  clearanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearanceCheckCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFCF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearanceTitleText: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  clearanceSubtext: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 252, 247, 0.78)',
  },
  detailsBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.surface.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    fontFamily: Platform.select({
      ios: 'SpaceMono-Bold',
      android: 'SpaceMono-Bold',
      default: 'monospace',
    }),
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: '#5F6B80',
    fontWeight: '700',
  },
  metricValueMono: {
    fontFamily: Platform.select({
      ios: 'SpaceMono-Bold',
      android: 'SpaceMono-Bold',
      default: 'monospace',
    }),
    fontSize: 15,
    lineHeight: 18,
    color: Colors.navy,
    fontWeight: '700',
  },
  metricValueSans: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 18,
    color: Colors.navy,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionEyebrow: {
    fontFamily: Platform.select({
      ios: 'SpaceMono-Bold',
      android: 'SpaceMono-Bold',
      default: 'monospace',
    }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: '#5F6B80',
    fontWeight: '700',
  },
  bodyDescription: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary,
  },
  skillsEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skillsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.hairline,
  },
  skillChipText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.text.primary,
  },
  privacyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.hairline,
  },
  privacyNoticeText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#5F6B80',
  },
  bottomCtaContainer: {
    gap: 8,
    paddingTop: 8,
  },
  applyBtn: {
    backgroundColor: '#5F4DB2',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnSubmitting: {
    opacity: 0.7,
  },
  applyBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  appliedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F6B45',
    borderRadius: 999,
    paddingVertical: 18,
  },
  keepLookingBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.surface.borderSecondary,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepLookingBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy,
  },
  disabledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0EBDF',
    borderWidth: 1,
    borderColor: Colors.surface.hairline,
    borderRadius: 999,
    paddingVertical: 18,
  },
  disabledBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#5F6B80',
  },
  applySubtext: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
    textAlign: 'center',
  },
  applyErrorText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.red.fg,
    textAlign: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
