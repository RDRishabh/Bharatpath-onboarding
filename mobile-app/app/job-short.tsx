/**
 * BharatPath — Short of the Bar Job Detail Route
 * Matches Screen 36 in Handoff & Screenshot 4.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { JobDetailShortScreen } from '@/screens/jobs/JobDetailShortScreen';

export default function JobShortRoute() {
  const router = useRouter();

  return (
    <JobDetailShortScreen
      onBack={() => router.back()}
      onWorkOnScore={() => router.push('/attribute-check' as any)}
      onNotifyMe={() => {
        // Keeps user on page with alert feedback
      }}
    />
  );
}
