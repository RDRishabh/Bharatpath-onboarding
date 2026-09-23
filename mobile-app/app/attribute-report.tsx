/** Read back the questionnaire answers returned by the backend. */
import { useRouter } from 'expo-router';
import { QuestionnaireReportScreen } from '@/screens/attribute-check/QuestionnaireReportScreen';

export default function AttributeReportRoute() {
  const router = useRouter();

  return (
    <QuestionnaireReportScreen
      onDone={() => router.replace('/home')}
      onUpdateAnswers={() => router.replace('/attribute-quiz')}
    />
  );
}
