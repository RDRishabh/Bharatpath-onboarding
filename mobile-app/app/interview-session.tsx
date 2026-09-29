/**
 * BharatPath — Active Mock Interview Session Route
 * Manages question preparation, live recording, keep/retake, and offline queue.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { InterviewSessionScreen } from '@/screens/interview/InterviewSessionScreen';

export default function InterviewSessionRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  if (!sessionId) return <Redirect href="/mock-interview" />;
  return <InterviewSessionScreen sessionId={sessionId} />;
}
