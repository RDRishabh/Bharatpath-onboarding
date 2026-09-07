/**
 * BharatPath — Final Mock Interview Report Route
 * Marked on 4 dimensions, rubric analysis, and advice.
 */
import { useRouter } from 'expo-router';
import { InterviewReportScreen } from '@/screens/interview/InterviewReportScreen';

export default function InterviewReportRoute() {
  const router = useRouter();

  return (
    <InterviewReportScreen
      onGoHome={() => {
        router.replace('/home');
      }}
      onFindJobs={() => {
        router.push('/jobs' as any);
      }}
    />
  );
}
