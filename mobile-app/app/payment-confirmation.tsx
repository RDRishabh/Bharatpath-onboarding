/**
 * BharatPath — Payment Confirmation Route
 * Shows confirmed session unlock, receipt reference, and start button.
 */
import { useRouter } from 'expo-router';
import { PaymentConfirmationScreen } from '@/screens/interview/PaymentConfirmationScreen';

export default function PaymentConfirmationRoute() {
  const router = useRouter();

  return (
    <PaymentConfirmationScreen
      onStartInterview={() => {
        router.replace('/home');
      }}
      onGoHome={() => {
        router.replace('/home');
      }}
    />
  );
}
