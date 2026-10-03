/** Read back the questionnaire answers returned by the backend. */
import { useRouter } from 'expo-router';
import { QuestionnaireReportScreen } from '@/screens/attribute-check/QuestionnaireReportScreen';

export default function AttributeReportRoute() {
  const router = useRouter();

  const handleDone = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/you');
    }
  };

  return (
    <QuestionnaireReportScreen
      onDone={handleDone}
      onUpdateAnswers={() => router.replace('/attribute-quiz')}
    />
  );
}
