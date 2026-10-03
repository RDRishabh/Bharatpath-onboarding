import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Fallback route for /subscription.
 * Automatically forwards candidates to their profile & membership management screen (/you).
 */
export default function SubscriptionRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/you');
  }, [router]);

  return null;
}
