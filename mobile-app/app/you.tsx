/**
 * BharatPath — You / Profile Route
 * Fully implemented Candidate Profile Screen matching Screen 40 in Handoff & Screenshot 1.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { TabName } from '@/components/navigation/BottomTabBar';

export default function YouRoute() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>('you');

  const handleTabPress = (tab: TabName, href: string) => {
    setActiveTab(tab);
    if (tab !== 'you') {
      router.push(href as any);
    }
  };

  return (
    <ProfileScreen
      name="Priya Deshmukh"
      initials="PD"
      phoneAndCity="+91 98••• ••42 · Pune"
      score={706}
      appliedCount={6}
      addonsCount={2}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onScorePress={() => router.push('/' as any)}
      onAppliedPress={() => router.push('/board' as any)}
      onAddonsPress={() => router.push('/attribute-report' as any)}
      onResumeDetailsPress={() => {
        Alert.alert(
          'Resume Details',
          'Candidate resume parsed and verified: Priya Deshmukh, Pune. 3 verified skill badges.',
          [{ text: 'OK' }]
        );
      }}
      onAttributeReportPress={() => router.push('/attribute-report' as any)}
      onInterviewReportPress={() => router.push('/interview-report' as any)}
      onLanguagePress={() => {
        Alert.alert('Language Settings', 'Currently active: English. Hindi and regional languages available soon.', [
          { text: 'OK' },
        ]);
      }}
      onWhoHasSeenMePress={() => router.push('/who-has-seen-me' as any)}
      onDownloadDataPress={() => {
        Alert.alert('Download Data', 'Your data archive is being prepared. It will be ready by 15 Aug.', [
          { text: 'Got it' },
        ]);
      }}
      onDeleteAccountPress={() => {
        Alert.alert(
          'Delete Account',
          'Are you sure you want to permanently delete your BharatPath profile and test results?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => router.replace('/' as any) },
          ]
        );
      }}
    />
  );
}
