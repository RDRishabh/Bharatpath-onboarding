/**
 * BharatPath — Active Mock Interview Session Route
 * Manages question preparation, live recording, keep/retake, and offline queue.
 */
import { useRouter } from 'expo-router';
import { InterviewSessionScreen } from '@/screens/interview/InterviewSessionScreen';

export default function InterviewSessionRoute() {
  const router = useRouter();

  return (
    <InterviewSessionScreen
      initialQuestionIndex={1} // Question 2 to match user's screenshot, fully interactive
      onFinishSession={() => {
        router.replace('/interview-report' as any);
      }}
    />
  );
}
