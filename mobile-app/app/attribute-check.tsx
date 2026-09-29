/**
 * BharatPath — Attribute Check Route
 * "How you like to work" - Work style & interests evaluation.
 */
import { useRouter } from 'expo-router';
import { AttributeCheckScreen } from '@/screens/attribute-check/AttributeCheckScreen';

export default function AttributeCheckRoute() {
  const router = useRouter();

  return (
    <AttributeCheckScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/home');
        }
      }}
      onStartQuiz={() => {
        router.push('/attribute-quiz');
      }}
      onViewReport={() => {
        router.push('/attribute-report');
      }}
    />
  );
}
