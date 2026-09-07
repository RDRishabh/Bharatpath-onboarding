/**
 * BharatPath — Home Screen Route
 * Main application landing dashboard.
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TabName } from '@/components/navigation/BottomTabBar';

export default function HomeRoute() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('home');

  const handleTabPress = (tab: TabName, href: string) => {
    setActiveTab(tab);
    if (tab !== 'home') {
      router.push(href as any);
    }
  };

  return (
    <HomeScreen
      candidateName="Priya"
      candidateInitials="PD"
      currentDate="Wednesday, 12 Aug"
      score={706}
      maxScore={999}
      bandName="Emerging"
      bandNumber={1}
      bandTotal={4}
      scoreGain={26}
      fixesLeft={2}
      fixesWorth={32}
      pointsToNextBand={28}
      nextBandName="Building"
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onExploreJobs={() => router.push('/jobs')}
      onAllJobsPress={() => router.push('/jobs')}
      onScorePress={() => router.push('/' as any)}
      onAttributeCheckPress={() => router.push('/attribute-check' as any)}
      onMockInterviewPress={() => router.push('/mock-interview' as any)}
      onNotificationsPress={() => router.push('/notifications' as any)}
      onProfilePress={() => router.push('/you' as any)}
    />
  );
}
