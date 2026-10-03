/**
 * BharatPath - Interview Sessions List Route
 *
 * Lists past mock interview sessions so the candidate can open the feedback
 * report for any completed one. Reached from the profile screen's
 * "Interview report" row.
 */
import { useRouter } from 'expo-router';
import { InterviewSessionsScreen } from '@/screens/interview/InterviewSessionsScreen';

export default function InterviewSessionsRoute() {
  const router = useRouter();
  return <InterviewSessionsScreen onBack={() => router.back()} />;
}
