/**
 * BharatPath — Jobs Hub Route
 * Fully implemented Jobs Feed matching Screen 33 in Handoff & Screenshot 1.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { JobsFeedScreen } from '@/screens/jobs/JobsFeedScreen';
import { TabName } from '@/components/navigation/BottomTabBar';

export default function JobsRoute() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('jobs');

  const handleTabPress = (tab: TabName, href: string) => {
    setActiveTab(tab);
    if (tab !== 'jobs') {
      router.push(href as any);
    }
  };

  const handleJobPress = (jobId: string) => {
    if (jobId === 'nivara-foods') {
      // Short of the bar flow
      router.push('/job-short' as any);
    } else {
      // Clear the bar / qualified flow
      router.push('/job-detail' as any);
    }
  };

  return (
    <JobsFeedScreen
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onJobPress={handleJobPress}
      onScoreBannerPress={() => router.push('/' as any)}
    />
  );
}
