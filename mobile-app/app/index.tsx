/**
 * BharatPath — Foundation Preview
 * The initial landing route that validates the complete design system.
 * Looks like an actual product screen, not a component showcase.
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';

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
import { HomeScreen } from '@/screens/home/HomeScreen';

export default function FoundationPreview() {
  const router = useRouter();
  const [step, setStep] = useState<'splash' | 'intro' | 'language' | 'howItWorks' | 'intake' | 'parsing' | 'review' | 'scoring' | 'score' | 'breakdown' | 'suggestions' | 'recalculated' | 'signup' | 'otp' | 'notifications' | 'share' | 'preview'>('splash');
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | undefined>();
  const [userPhone, setUserPhone] = useState<string>('98765 43242');
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('home');

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    if (tab !== 'home' && tab !== 'preview') {
      router.push(href as any);
    }
  };

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
    <HomeScreen
      candidateName="Priya"
      candidateInitials="PD"
      currentDate="Wednesday, 12 Aug"
      score={706}
      maxScore={999}
      bandName="Emerging"
      bandNumber={1}
      bandTotal={4}
      scoreGain={26}
      fixesLeft={2}
      fixesWorth={32}
      pointsToNextBand={28}
      nextBandName="Building"
      activeTab="home"
      onTabPress={(tab, href) => {
        if (tab !== 'home') {
          router.push(href as any);
        }
      }}
      onExploreJobs={() => router.push('/jobs')}
      onAllJobsPress={() => router.push('/jobs')}
      onScorePress={() => setStep('score')}
    />
  );
}
