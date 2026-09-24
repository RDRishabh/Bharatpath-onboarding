/**
 * BharatPath — Foundation Preview & Authentication Flow
 * Seamlessly connects Candidate Auth (Cognito-aligned) with the Onboarding & Core App.
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { SplashScreen } from '@/screens/splash/SplashScreen';
import { IntroScreen } from '@/screens/onboarding/IntroScreen';
import { SignUpScreen, LoginScreen, EmailVerificationScreen } from '@/screens/auth';
import { SubscribeScreen } from '@/screens/subscription/SubscribeScreen';
import { LanguageSelectScreen } from '@/screens/onboarding/LanguageSelectScreen';
import { HowItWorksScreen } from '@/screens/onboarding/HowItWorksScreen';
import { ResumeIntakeScreen, UploadedFileMeta, ResumeIntakePayload } from '@/screens/onboarding/ResumeIntakeScreen';
import { ParsingScreen } from '@/screens/onboarding/ParsingScreen';
import { ReviewDetailsScreen } from '@/screens/onboarding/ReviewDetailsScreen';
import { ScoringScreen } from '@/screens/onboarding/ScoringScreen';
import { ScoreRevealScreen } from '@/screens/onboarding/ScoreRevealScreen';
import { ScoreBreakdownScreen } from '@/screens/onboarding/ScoreBreakdownScreen';
import { SuggestionsScreen } from '@/screens/onboarding/SuggestionsScreen';
import { NotificationPermissionScreen } from '@/screens/onboarding/NotificationPermissionScreen';
import { ShareResultScreen } from '@/screens/onboarding/ShareResultScreen';
import {
  ResumeVersionDetailResponse,
  getResumeVersionDetails,
  listResumeVersions,
} from '@/services/api/resume';
import { CandidateScoreResponse, bandIndex, bandLabel, nextBandLabel, pointsToNextBand } from '@/services/api/scoring';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { useAuthContext } from '@/context/AuthContext';

type AppStep =
  | 'splash'
  | 'intro'
  | 'signup'
  | 'login'
  | 'verify-email'
  | 'language'
  | 'howItWorks'
  | 'subscribe'
  | 'intake'
  | 'parsing'
  | 'review'
  | 'scoring'
  | 'score'
  | 'breakdown'
  | 'suggestions'
  | 'recalculated'
  | 'notifications'
  | 'share'
  | 'preview';

export default function FoundationPreview() {
  const router = useRouter();
  const { candidateFullName } = useAuthContext();
  const [step, setStep] = useState<AppStep>('splash');
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | undefined>();
  const [intakePayload, setIntakePayload] = useState<ResumeIntakePayload | undefined>();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('home');

  const [resumeVersionId, setResumeVersionId] = useState<string | undefined>();
  const [resumeVersionDetails, setResumeVersionDetails] = useState<ResumeVersionDetailResponse | null>(null);
  const [candidateScore, setCandidateScore] = useState<CandidateScoreResponse | null>(null);

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    if (tab !== 'home' && tab !== 'preview') {
      router.push(href as any);
    }
  };

  if (step === 'splash') {
    return <SplashScreen onFinish={() => setStep('intro')} />;
  }

  // 1. Initial Intro Screen with "Get started free" & "I already have an account"
  if (step === 'intro') {
    return (
      <IntroScreen
        onGetStarted={() => setStep('signup')}
        onAlreadyHaveAccount={() => setStep('login')}
      />
    );
  }

  // 2. Candidate Sign Up Screen (Full Name, Email, Password, Confirm Password)
  if (step === 'signup') {
    return (
      <SignUpScreen
        onBack={() => setStep('intro')}
        onNavigateToLogin={() => setStep('login')}
        onSubmit={(data) => {
          setUserEmail(data.email);
          setUserName(data.fullName);
          setStep('verify-email');
        }}
      />
    );
  }

  // 3. Candidate Login Screen (Email, Password, Forgot Password)
  if (step === 'login') {
    return (
      <LoginScreen
        onBack={() => setStep('intro')}
        onNavigateToSignUp={() => setStep('signup')}
        onForgotPassword={() => {
          // Placeholder for forgot password flow
        }}
        onSubmit={async (data) => {
          setUserEmail(data.session.email);
          const name = data.profile?.full_name?.trim();
          if (name) {
            setUserName(name);
          }
          try {
            const versions = await listResumeVersions();
            const unconfirmed = versions.find((v) => !v.confirmed && !v.superseded);
            if (unconfirmed) {
              const verDetails = await getResumeVersionDetails(unconfirmed.resume_version_id);
              setResumeVersionId(unconfirmed.resume_version_id);
              setResumeVersionDetails(verDetails);
              setStep('review');
              return;
            }
          } catch (e) {
            console.warn('Could not check existing resume versions:', e);
          }
          // Backend flow: membership first — the score, jobs and every add-on
          // answer 402 without a live subscription.
          setStep('subscribe');
        }}
      />
    );
  }

  // 4. Email Verification Screen (6-digit code sent by Cognito)
  if (step === 'verify-email') {
    return (
      <EmailVerificationScreen
        email={userEmail}
        onBack={() => setStep('signup')}
        onVerify={(_code) => {
          setStep('subscribe');
        }}
        onResendCode={() => {
          // Resend trigger
        }}
      />
    );
  }

  // 5. Onboarding: Language Selection
  if (step === 'language') {
    return (
      <LanguageSelectScreen
        onSelectLanguage={() => setStep('howItWorks')}
      />
    );
  }

  // 6. Onboarding: How It Works
  if (step === 'howItWorks') {
    return (
      <HowItWorksScreen
        onBack={() => setStep('language')}
        onGotIt={() => setStep('subscribe')}
      />
    );
  }

  // 7. Membership — pay-first, before a CV is taken
  if (step === 'subscribe') {
    return (
      <SubscribeScreen
        candidateName={userName}
        onSubscribed={() => setStep('intake')}
        onSkip={() => setStep('intake')}
      />
    );
  }

  // 8. Onboarding: Resume Intake (Upload or Structured Input)
  if (step === 'intake') {
    return (
      <ResumeIntakeScreen
        userName={userName}
        onBack={() => setStep('subscribe')}
        onSelectOption={(_option, meta, payload) => {
          if (meta) {
            setFileMeta(meta);
          }
          if (payload) {
            setIntakePayload(payload);
          }
          setStep('parsing');
        }}
      />
    );
  }

  // 9. Onboarding: Resume Parsing
  if (step === 'parsing') {
    return (
      <ParsingScreen
        fileMeta={fileMeta}
        payload={intakePayload}
        onReviewFound={(verId, details) => {
          setResumeVersionId(verId);
          setResumeVersionDetails(details);
          setStep('review');
        }}
      />
    );
  }

  // 10. Onboarding: Review Parsed Details (The confirm gate before scoring)
  if (step === 'review') {
    return (
      <ReviewDetailsScreen
        candidateName={userName}
        candidateEmail={userEmail}
        manualData={intakePayload?.manualData}
        versionId={resumeVersionId}
        versionDetails={resumeVersionDetails}
        onVersionUpdated={(verId, details) => {
          setResumeVersionId(verId);
          setResumeVersionDetails(details);
        }}
        onConfirm={() => setStep('scoring')}
      />
    );
  }

  // 11. Scoring — polls GET /candidate/score/me for a real number.
  // Shows a pending state, never a stand-in score. See ScoringScreen.tsx for
  // the worker and Layer 1 configuration this needs to produce one.
  if (step === 'scoring') {
    return (
      <ScoringScreen
        onReady={(score) => {
          setCandidateScore(score);
          setStep('score');
        }}
        onContinueWithoutScore={() => setStep('score')}
      />
    );
  }

  // 12. Score Reveal
  if (step === 'score') {
    return (
      <ScoreRevealScreen
        mode="initial"
        score={candidateScore?.value ?? undefined}
        band={candidateScore?.band}
        onSave={() => setStep('notifications')}
        onRaiseScore={() => setStep('suggestions')}
        onAllCategories={() => setStep('breakdown')}
      />
    );
  }

  // 13-15. Breakdown, suggestions and the recalculated reveal are DESIGN
  // MOCK-UPS with no backend behind them, and they cannot be wired: the client
  // removed score explanation (2026-08-27, re-confirmed 2026-09-11), so there
  // is no breakdown, category or improvement endpoint, and
  // `test_score_never_explained.py` fails the build on a schema that adds one.
  // These steps should be dropped from the flow rather than integrated.
  if (step === 'breakdown') {
    return (
      <ScoreBreakdownScreen
        onBack={() => setStep('score')}
        onActionPress={() => setStep('suggestions')}
      />
    );
  }

  // 14. Suggestions Screen
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

  // 15. Recalculated Score Screen
  if (step === 'recalculated') {
    return (
      <ScoreRevealScreen
        mode="recalculated"
        score={706}
        onNextFix={() => setStep('suggestions')}
        onSave={() => setStep('notifications')}
        onRaiseScore={() => setStep('suggestions')}
        onAllCategories={() => setStep('breakdown')}
      />
    );
  }

  // 16. Notification Permissions
  if (step === 'notifications') {
    return (
      <NotificationPermissionScreen
        onAllow={() => setStep('share')}
        onNotNow={() => setStep('share')}
      />
    );
  }

  // 17. Share Result Screen
  if (step === 'share') {
    return (
      <ShareResultScreen
        score={candidateScore?.value ?? undefined}
        maxScore={990}
        bandName={bandLabel(candidateScore?.band) || undefined}
        candidateName={userName}
        candidateField="B.Sc Microbiology"
        candidateCity="Pune"
        scoreDate="AUG 2026"
        onBack={() => setStep('notifications')}
        onSave={() => setStep('preview')}
        onShare={() => setStep('preview')}
      />
    );
  }

  // 18. Authenticated Home Screen
  return (
    <HomeScreen
      candidateName={candidateFullName || userName || undefined}
      score={candidateScore?.value ?? undefined}
      maxScore={990}
      bandName={bandLabel(candidateScore?.band) || undefined}
      bandNumber={bandIndex(candidateScore?.band)}
      bandTotal={4}
      scoreGain={26}
      fixesLeft={2}
      fixesWorth={32}
      pointsToNextBand={pointsToNextBand(candidateScore?.value ?? null, candidateScore?.band ?? null) ?? 0}
      nextBandName={nextBandLabel(candidateScore?.band ?? null) || 'Solid'}
      activeTab="home"
      onTabPress={(tab, href) => {
        if (tab !== 'home') {
          router.push(href as any);
        }
      }}
      onExploreJobs={() => router.push('/jobs')}
      onAllJobsPress={() => router.push('/jobs')}
      onScorePress={() => setStep('score')}
      onAttributeCheckPress={() => router.push('/attribute-check' as any)}
      onMockInterviewPress={() => router.push('/mock-interview' as any)}
      onNotificationsPress={() => router.push('/notifications' as any)}
      onProfilePress={() => router.push('/you' as any)}
    />
  );
}
