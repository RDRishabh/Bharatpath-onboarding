/**
 * BharatPath - Application Board Route
 *
 * The Board tab. Lists the candidate's own applications and routes to the
 * detail screen with the application id.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ApplicationBoardScreen } from '@/screens/board/ApplicationBoardScreen';
import { TabName } from '@/components/navigation/BottomTabBar';

export default function BoardRoute() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('board');

  const handleTabPress = (tab: TabName, href: string) => {
    setActiveTab(tab);
    if (tab !== 'board') {
      router.push(href as any);
    }
  };

  const handleApplicationPress = (appId: string) => {
    router.push({
      pathname: '/application-detail',
      params: { id: appId },
    } as any);
  };

  return (
    <ApplicationBoardScreen
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onApplicationPress={handleApplicationPress}
    />
  );
}
