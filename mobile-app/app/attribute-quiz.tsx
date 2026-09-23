/** The backend-defined optional work-preferences questionnaire. */
import { useRouter } from 'expo-router';
import { AttributeQuestionsScreen } from '@/screens/attribute-check/AttributeQuestionsScreen';

export default function AttributeQuizRoute() {
  const router = useRouter();

  return (
    <AttributeQuestionsScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/attribute-check');
        }
      }}
      onSaveAndExit={() => router.replace('/home')}
      onSubmitted={() => router.replace('/attribute-report')}
    />
  );
}
