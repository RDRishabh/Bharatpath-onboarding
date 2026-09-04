/**
 * BharatPath — Foundation Preview
 * The initial landing route that validates the complete design system.
 * Looks like an actual product screen, not a component showcase.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Sparkle, ArrowRight, SealCheck, MapPin, Clock } from 'phosphor-react-native';
import { HeroScreen } from '@/components/layouts/HeroScreen';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { EyebrowRow } from '@/components/cards/EyebrowRow';
import { Card } from '@/components/cards/Card';
import { StatusChip } from '@/components/StatusChip';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { ProgressMeter } from '@/components/ProgressMeter';
import { NoteStrip } from '@/components/feedback/NoteStrip';
import { SkillChip } from '@/components/chips/SkillChip';
import { CompanyMonogram } from '@/components/CompanyMonogram';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { TertiaryButton } from '@/components/buttons/TertiaryButton';
import { CTAStickyBand } from '@/components/CTAStickyBand';
import { Colors, Typography, Spacing, Radii } from '@/theme/tokens';
import { mockCareerScore, mockProgressSteps, mockNote, mockJobs, mockSkills, mockCTA } from '@/mocks/mockData';

import { SplashScreen } from '@/screens/splash/SplashScreen';
import { IntroScreen } from '@/screens/onboarding/IntroScreen';
import { LanguageSelectScreen } from '@/screens/onboarding/LanguageSelectScreen';
import { HowItWorksScreen } from '@/screens/onboarding/HowItWorksScreen';
import { ResumeIntakeScreen, UploadedFileMeta } from '@/screens/onboarding/ResumeIntakeScreen';
import { ParsingScreen } from '@/screens/onboarding/ParsingScreen';
import { ReviewDetailsScreen } from '@/screens/onboarding/ReviewDetailsScreen';
import { ScoringScreen } from '@/screens/onboarding/ScoringScreen';
import { ScoreRevealScreen } from '@/screens/onboarding/ScoreRevealScreen';
import { ScoreBreakdownScreen } from '@/screens/onboarding/ScoreBreakdownScreen';
import { SuggestionsScreen } from '@/screens/onboarding/SuggestionsScreen';
import { CreateAccountScreen } from '@/screens/onboarding/CreateAccountScreen';
import { OtpVerificationScreen } from '@/screens/onboarding/OtpVerificationScreen';
import { NotificationPermissionScreen } from '@/screens/onboarding/NotificationPermissionScreen';
import { ShareResultScreen } from '@/screens/onboarding/ShareResultScreen';

export default function FoundationPreview() {
  const router = useRouter();
  const [step, setStep] = useState<'splash' | 'intro' | 'language' | 'howItWorks' | 'intake' | 'parsing' | 'review' | 'scoring' | 'score' | 'breakdown' | 'suggestions' | 'recalculated' | 'signup' | 'otp' | 'notifications' | 'share' | 'preview'>('splash');
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | undefined>();
  const [userPhone, setUserPhone] = useState<string>('98765 43242');
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('preview');

  const handleTabPress = useCallback((tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    router.push(href as any);
  }, [router]);

  const job = mockJobs[0];

  if (step === 'splash') {
    return <SplashScreen onFinish={() => setStep('intro')} />;
  }

  if (step === 'intro') {
    return (
      <IntroScreen
        onGetStarted={() => setStep('language')}
        onAlreadyHaveAccount={() => setStep('language')}
      />
    );
  }

  if (step === 'language') {
    return (
      <LanguageSelectScreen
        onSelectLanguage={() => setStep('howItWorks')}
      />
    );
  }

  if (step === 'howItWorks') {
    return (
      <HowItWorksScreen
        onBack={() => setStep('language')}
        onGotIt={() => setStep('intake')}
      />
    );
  }

  if (step === 'intake') {
    return (
      <ResumeIntakeScreen
        onBack={() => setStep('howItWorks')}
        onSelectOption={(_option, meta) => {
          if (meta) {
            setFileMeta(meta);
          }
          setStep('parsing');
        }}
      />
    );
  }

  if (step === 'parsing') {
    return (
      <ParsingScreen
        fileMeta={fileMeta}
        onReviewFound={() => setStep('review')}
      />
    );
  }

  if (step === 'review') {
    return (
      <ReviewDetailsScreen
        onConfirm={() => setStep('scoring')}
      />
    );
  }

  if (step === 'scoring') {
    return (
      <ScoringScreen
        onShowScore={() => setStep('score')}
      />
    );
  }

  if (step === 'score') {
    return (
      <ScoreRevealScreen
        mode="initial"
        onSave={() => setStep('signup')}
        onRaiseScore={() => setStep('suggestions')}
        onAllCategories={() => setStep('breakdown')}
      />
    );
  }

  if (step === 'breakdown') {
    return (
      <ScoreBreakdownScreen
        onBack={() => setStep('score')}
        onActionPress={() => setStep('suggestions')}
      />
    );
  }

  if (step === 'suggestions') {
    return (
      <SuggestionsScreen
        onBack={() => setStep('score')}
        onAddSkills={() => setStep('recalculated')}
        onEditProject={() => setStep('recalculated')}
        onFixSpellings={() => setStep('recalculated')}
      />
    );
  }

  if (step === 'recalculated') {
    return (
      <ScoreRevealScreen
        mode="recalculated"
        score={706}
        onNextFix={() => setStep('suggestions')}
        onSave={() => setStep('signup')}
        onRaiseScore={() => setStep('suggestions')}
        onAllCategories={() => setStep('breakdown')}
      />
    );
  }

  if (step === 'signup') {
    return (
      <CreateAccountScreen
        score={706}
        onBack={() => setStep('recalculated')}
        onSendCode={(phone) => {
          if (phone) setUserPhone(phone);
          setStep('otp');
        }}
        onGoogleAuth={() => setStep('notifications')}
        onEmailAuth={() => setStep('notifications')}
      />
    );
  }

  if (step === 'otp') {
    return (
      <OtpVerificationScreen
        phoneNumber={userPhone}
        onBack={() => setStep('signup')}
        onChangePhone={() => setStep('signup')}
        onVerify={() => setStep('notifications')}
      />
    );
  }

  if (step === 'notifications') {
    return (
      <NotificationPermissionScreen
        onAllow={() => setStep('share')}
        onNotNow={() => setStep('share')}
      />
    );
  }

  if (step === 'share') {
    return (
      <ShareResultScreen
        score={706}
        maxScore={999}
        bandName="Emerging"
        candidateName="Priya D."
        candidateField="B.Sc Microbiology"
        candidateCity="Pune"
        scoreDate="AUG 2026"
        onBack={() => setStep('notifications')}
        onSave={() => setStep('preview')}
        onShare={() => setStep('preview')}
      />
    );
  }

  return (
    <View style={styles.root}>
      <HeroScreen
        heroContent={
          <>
            <EyebrowRow
              label="BharatPath · Foundation"
              icon={<Sparkle size={12} color={Colors.gold} weight="fill" />}
              color={Colors.text.mutedOnNavy}
            />
            <Text style={styles.heroTitle}>
              Your career,{'\n'}quietly unstoppable.
            </Text>
            <Text style={styles.heroSubtitle}>
              A calm, premium space for India's most ambitious job seekers.
            </Text>
          </>
        }
      >
        {/* Score section */}
        <View style={styles.section}>
          <ScoreDisplay
            current={mockCareerScore.current}
            max={mockCareerScore.max}
            label={mockCareerScore.label}
            delta={mockCareerScore.delta}
          />
        </View>

        {/* Earned gold accent strip */}
        <View style={styles.earnedStrip}>
          <SealCheck size={18} color={Colors.goldDeep} weight="fill" />
          <Text style={styles.earnedText}>
            Assessment complete — you've earned the readiness badge
          </Text>
        </View>

        {/* Indigo progress element */}
        <View style={styles.section}>
          <EyebrowRow label="Onboarding progress" color={Colors.text.muted} />
          <ProgressMeter steps={mockProgressSteps} style={styles.progressMeter} />
          <View style={styles.progressLabels}>
            {mockProgressSteps.map((step, i) => (
              <Text
                key={i}
                style={[
                  styles.progressLabel,
                  step.completed && styles.progressLabelDone,
                ]}
              >
                {step.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Sample job card with MATCH chip */}
        <View style={styles.section}>
          <EyebrowRow label="Recommended for you" color={Colors.text.muted} />
          <Card style={styles.jobCard} onPress={() => {}}>
            <View style={styles.jobCardHeader}>
              <CompanyMonogram name={job.company} size={44} />
              <View style={styles.jobCardInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobCompany}>{job.company}</Text>
              </View>
              <StatusChip type="MATCH" />
            </View>
            <View style={styles.jobMetaRow}>
              <View style={styles.jobMetaItem}>
                <MapPin size={14} color={Colors.text.muted} weight="bold" />
                <Text style={styles.jobMetaText}>{job.location}</Text>
              </View>
              <View style={styles.jobMetaItem}>
                <Clock size={14} color={Colors.text.muted} weight="bold" />
                <Text style={styles.jobMetaText}>{job.experience}</Text>
              </View>
            </View>
            <Text style={styles.jobSalary}>{job.salary}</Text>
            <View style={styles.skillRow}>
              {job.skills.slice(0, 3).map((skill) => (
                <SkillChip key={skill} label={skill} />
              ))}
            </View>
          </Card>
        </View>

        {/* Buttons row */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <PrimaryButton
              label="Apply now"
              style={styles.flex1}
              rightIcon={<ArrowRight size={18} color={Colors.offWhite} weight="bold" />}
            />
            <SecondaryButton label="Save" style={styles.flex1} />
          </View>
          <TertiaryButton
            label="See 12 more matches"
            rightIcon={<ArrowRight size={16} color={Colors.indigo} weight="bold" />}
          />
        </View>

        {/* Note strip */}
        <View style={styles.section}>
          <NoteStrip text={mockNote.text} variant="info" />
        </View>

        {/* Skill chips row */}
        <View style={styles.section}>
          <EyebrowRow label="Your top skills" color={Colors.text.muted} />
          <View style={styles.skillRow}>
            {mockSkills.slice(0, 5).map((skill) => (
              <SkillChip key={skill} label={skill} />
            ))}
          </View>
        </View>

        {/* CTA band */}
        <View style={styles.section}>
          <CTAStickyBand
            title={mockCTA.title}
            subtitle={mockCTA.subtitle}
            ctaLabel={mockCTA.ctaLabel}
          />
        </View>

        {/* Status chip taxonomy preview */}
        <View style={styles.section}>
          <EyebrowRow label="Status taxonomy" color={Colors.text.muted} />
          <View style={styles.chipGrid}>
            <StatusChip type="MATCH" />
            <StatusChip type="SHORT" />
            <StatusChip type="INTERVIEW" />
            <StatusChip type="SENT" />
            <StatusChip type="EXPIRING" />
            <StatusChip type="PAID" />
            <StatusChip type="BAND" bandCurrent={1} bandTotal={4} />
          </View>
        </View>
      </HeroScreen>

      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  heroTitle: {
    ...Typography.screenTitle,
    fontSize: 30,
    lineHeight: 38,
    color: Colors.offWhite,
    marginTop: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.text.mutedOnNavy,
    marginTop: Spacing.xs,
    maxWidth: 280,
  },
  section: {
    marginTop: Spacing.xl,
  },
  scoreOnNavy: {
    // ScoreDisplay is in sheet
  },
  earnedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F7EFD6',
    borderWidth: 1,
    borderColor: '#E8D9A8',
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginTop: Spacing.lg,
  },
  earnedText: {
    ...Typography.caption,
    color: Colors.goldDeep,
    flex: 1,
    flexShrink: 1,
  },
  progressMeter: {
    marginTop: Spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  progressLabel: {
    ...Typography.monoMeta,
    color: Colors.text.muted,
  },
  progressLabelDone: {
    color: Colors.indigoSemantic.fg,
  },
  jobCard: {
    marginTop: Spacing.sm,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  jobCardInfo: {
    flex: 1,
  },
  jobTitle: {
    ...Typography.cardTitle,
    color: Colors.navy,
  },
  jobCompany: {
    ...Typography.caption,
    color: Colors.text.muted,
    marginTop: 2,
  },
  jobMetaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  jobMetaText: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.text.muted,
  },
  jobSalary: {
    ...Typography.monoNumber,
    fontSize: 15,
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
