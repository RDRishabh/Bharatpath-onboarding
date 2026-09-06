/**
 * BharatPath — Attribute Quiz Route
 * Evaluates candidate work style across 24 questions.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AttributeQuestionsScreen } from '@/screens/attribute-check/AttributeQuestionsScreen';
import { AttributeReportScreen } from '@/screens/attribute-check/AttributeReportScreen';
import {
  calculateAttributeScores,
  AttributeResult,
} from '@/data/attributeQuestions';

export default function AttributeQuizRoute() {
  const router = useRouter();
  const [result, setResult] = useState<AttributeResult | null>(null);

  if (result) {
    return (
      <AttributeReportScreen
        result={result}
        onDone={() => {
          router.replace('/home');
        }}
        onRetake={() => {
          setResult(null);
        }}
      />
    );
  }

  return (
    <AttributeQuestionsScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/attribute-check');
        }
      }}
      onComplete={(answers) => {
        const computed = calculateAttributeScores(answers);
        setResult(computed);
      }}
    />
  );
}
