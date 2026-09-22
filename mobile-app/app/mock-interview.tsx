/**
 * BharatPath — Mock Interview Intro Route
 * "Practise before it counts" - AI Mock interview preview & specifications.
 */
import { useRouter } from 'expo-router';
import { MockInterviewIntroScreen } from '@/screens/interview/MockInterviewIntroScreen';

export default function MockInterviewRoute() {
  const router = useRouter();

  return (
    <MockInterviewIntroScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/home');
        }
      }}
      onCheckPhone={() => {
        router.push('/device-check' as any);
      }}
    />
  );
}
