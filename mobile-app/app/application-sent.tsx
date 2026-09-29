/**
 * BharatPath — Application Sent Route
 *
 * Confirmation screen after a successful apply. Receives the employer name via
 * route params (from the apply flow) and falls back to a generic label.
 */
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ApplicationSentScreen } from '@/screens/jobs/ApplicationSentScreen';

export default function ApplicationSentRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ employer?: string }>();

  return (
    <ApplicationSentScreen
      companyName={params.employer ?? 'the employer'}
      onSeeBoard={() => router.push('/board' as any)}
      onKeepLooking={() => router.push('/jobs' as any)}
    />
  );
}
