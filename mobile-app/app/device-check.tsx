/**
 * BharatPath — Device Check Route
 * Hardware pre-flight diagnostics (camera, mic, network, lighting, storage).
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
      onPaymentComplete={() => {
        router.push('/payment-confirmation' as any);
      }}
    />
  );
}
