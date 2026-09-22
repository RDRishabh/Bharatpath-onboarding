/**
 * BharatPath — Qualified Job Detail Route
 * Matches Screen 35 in Handoff & Screenshot 2.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { JobDetailQualifiedScreen } from '@/screens/jobs/JobDetailQualifiedScreen';

export default function JobDetailRoute() {
  const router = useRouter();

  return (
    <JobDetailQualifiedScreen
      onBack={() => router.back()}
      onApply={() => router.push('/application-sent' as any)}
    />
  );
}
