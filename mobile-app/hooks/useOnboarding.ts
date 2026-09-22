import { useState } from 'react';
import { UploadedFileMeta } from '@/screens/onboarding/ResumeIntakeScreen';
import { parseResumeDocument, calculateReadinessScore } from '@/services/api/onboarding';
import { UserProfile, CareerScoreData } from '@/types/user';

export type OnboardingStep =
  | 'splash'
  | 'intro'
  | 'language'
  | 'howItWorks'
  | 'intake'
  | 'parsing'
  | 'review'
  | 'scoring'
  | 'score'
  | 'breakdown'
  | 'suggestions'
  | 'preview';

export function useOnboarding() {
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | undefined>();
  const [parsedProfile, setParsedProfile] = useState<Partial<UserProfile> | null>(null);
  const [scoreData, setScoreData] = useState<CareerScoreData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const startIntake = async (option: 'upload' | 'paste' | 'form', meta?: UploadedFileMeta) => {
    if (meta) setFileMeta(meta);
    setStep('parsing');
    setIsProcessing(true);

    try {
      const parsed = await parseResumeDocument(meta ? {
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        uploadedAt: new Date().toISOString(),
      } : {
        fileName: 'Priya_Deshmukh_Resume.pdf',
        fileSize: '412 KB',
        uploadedAt: new Date().toISOString(),
      });
      setParsedProfile(parsed);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReview = async () => {
    setStep('scoring');
    setIsProcessing(true);

    try {
      const score = await calculateReadinessScore(parsedProfile || {});
      setScoreData(score);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    step,
    setStep,
    fileMeta,
    parsedProfile,
    scoreData,
    isProcessing,
    startIntake,
    confirmReview,
  };
}
