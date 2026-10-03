/**
 * BharatPath - Streak Route
 * Full streak detail screen: current streak, points balance, milestone
 * ladder, and points history.
 */
import { useRouter } from 'expo-router';
import { StreakDetailScreen } from '@/screens/streak/StreakDetailScreen';

export default function StreakRoute() {
  const router = useRouter();

  return (
    <StreakDetailScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/home');
      }}
    />
  );
}
