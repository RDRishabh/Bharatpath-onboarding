/**
 * BharatPath — Notifications Route
 * Notification communication permissions and settings matching Screen 15 in Handoff.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { NotificationScreen } from '@/screens/notifications/NotificationScreen';

export default function NotificationsRoute() {
  const router = useRouter();

  return (
    <NotificationScreen
      onBack={() => router.back()}
      onAllow={() => {
        // Can optionally auto-return or stay to let user configure toggles
      }}
      onNotNow={() => router.back()}
    />
  );
}
