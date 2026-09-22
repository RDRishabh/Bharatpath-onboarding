/**
 * BharatPath — Mock Interview Rules Briefing Route
 * "Before we start" — 4 guidelines before entering the interview room.
 */
import { useRouter } from 'expo-router';
import { MockInterviewBriefingScreen } from '@/screens/interview/MockInterviewBriefingScreen';

export default function InterviewBriefingRoute() {
  const router = useRouter();

  return (
    <MockInterviewBriefingScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/home');
        }
      }}
      onReady={() => {
        router.push('/interview-session' as any);
      }}
    />
  );
}
