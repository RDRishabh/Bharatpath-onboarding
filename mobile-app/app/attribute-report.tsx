/**
 * BharatPath — Attribute Report Route
 * Displays candidate archetype and trait breakdown.
 */
import { useRouter } from 'expo-router';
import { AttributeReportScreen } from '@/screens/attribute-check/AttributeReportScreen';
import { calculateAttributeScores } from '@/data/attributeQuestions';

export default function AttributeReportRoute() {
  const router = useRouter();

  // Default sample answers for standalone route preview
  const defaultResult = calculateAttributeScores({
    1: 4, 2: 5, 3: 4, 4: 5, 5: 4, 6: 4, // Consistency High
    7: 5, 8: 4, 9: 5, 10: 4, 11: 4, 12: 4, // Detail High
    13: 3, 14: 3, 15: 4, 16: 3, 17: 3, 18: 3, // People Medium
    19: 2, 20: 2, 21: 2, 22: 3, 23: 3, 24: 2, // Ambiguity Low
  });

  return (
    <AttributeReportScreen
      result={defaultResult}
      onDone={() => {
        router.replace('/home');
      }}
      onRetake={() => {
        router.replace('/attribute-quiz');
      }}
    />
  );
}
