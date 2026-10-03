/**
 * BharatPath - Job Short Route (redirect)
 *
 * The old "short of the bar" screen is merged into `JobDetailScreen` (S18).
 * This route redirects to `/job-detail?id=<id>` for any stale links.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function JobShortRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  return (
    <Redirect
      href={{ pathname: '/job-detail', params: { id: params.id ?? '' } }}
    />
  );
}
