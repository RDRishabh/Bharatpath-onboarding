/**
 * BharatPath — Application Sent Route
 * Confirmation screen matching Screen 37 in Handoff & Screenshot 5.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { ApplicationSentScreen } from '@/screens/jobs/ApplicationSentScreen';

export default function ApplicationSentRoute() {
  const router = useRouter();

  return (
    <ApplicationSentScreen
      companyName="Sterling Diagnostics"
      onSeeBoard={() => router.push('/board' as any)}
      onKeepLooking={() => router.push('/jobs' as any)}
    />
  );
}
