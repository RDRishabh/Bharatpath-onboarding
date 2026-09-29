/**
 * BharatPath — Final Mock Interview Report Route
 * Marked on 4 dimensions, rubric analysis, and advice.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { InterviewReportScreen } from '@/screens/interview/InterviewReportScreen';

export default function InterviewReportRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  if (!sessionId) return <Redirect href="/mock-interview" />;
  return <InterviewReportScreen sessionId={sessionId} />;
}
