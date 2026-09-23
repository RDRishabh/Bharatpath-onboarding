/**
 * BharatPath — Application Detail Route
 *
 * Reads the application id from the route params and renders the detail
 * screen, which fetches the application and wires withdraw / confirm /
 * dispute actions. The screen handles its own back navigation.
 */
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ApplicationDetailScreen } from '@/screens/board/ApplicationDetailScreen';

export default function ApplicationDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ApplicationDetailScreen applicationId={id} onBack={() => router.back()} />
  );
}
