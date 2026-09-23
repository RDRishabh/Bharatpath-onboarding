/**
 * BharatPath — Home Screen Route
 * Main application landing dashboard.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TabName } from '@/components/navigation/BottomTabBar';
import { useAuthContext } from '@/context/AuthContext';
import { getMyScore, CandidateScoreResponse, bandIndex, bandLabel, nextBandLabel, pointsToNextBand } from '@/services/api/scoring';

export default function HomeRoute() {
  const router = useRouter();
  const { candidateFullName } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [candidateScore, setCandidateScore] = useState<CandidateScoreResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyScore()
      .then((score) => {
        if (!cancelled) setCandidateScore(score);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabPress = (tab: TabName, href: string) => {
    setActiveTab(tab);
    if (tab !== 'home') {
      router.push(href as any);
    }
  };

  return (
    <HomeScreen
      candidateName={candidateFullName || undefined}
      score={candidateScore?.status === 'READY' ? candidateScore.value ?? undefined : undefined}
      maxScore={999}
      bandName={bandLabel(candidateScore?.band) || undefined}
      bandNumber={bandIndex(candidateScore?.band)}
      bandTotal={4}
      pointsToNextBand={pointsToNextBand(candidateScore?.value ?? null, candidateScore?.band ?? null) ?? 28}
      nextBandName={nextBandLabel(candidateScore?.band ?? null) || undefined}
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
