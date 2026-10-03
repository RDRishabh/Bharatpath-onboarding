/**
 * BharatPath - Device Check Route
 * Audio pre-flight diagnostics before a subscription-included interview.
 */
import { useRouter } from 'expo-router';
import { DeviceCheckScreen } from '@/screens/interview/DeviceCheckScreen';

export default function DeviceCheckRoute() {
  const router = useRouter();

  return (
    <DeviceCheckScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/mock-interview' as any);
        }
      }}
    />
  );
}
