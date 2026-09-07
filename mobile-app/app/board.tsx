/**
 * BharatPath — Application Board Route
 * Fully implemented Application Board matching Screen 38 in Handoff & Screenshot 2.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
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

  const handleApplicationPress = (_appId: string) => {
    router.push('/application-detail' as any);
  };

  const handleJoinCall = (_appId: string) => {
    Alert.alert(
      'Interview Video Call',
      'Joining interview with Meera Kulkarni (Aurum Labs) scheduled for Tomorrow, 11:00 am.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ApplicationBoardScreen
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onApplicationPress={handleApplicationPress}
      onJoinCallPress={handleJoinCall}
    />
  );
}
