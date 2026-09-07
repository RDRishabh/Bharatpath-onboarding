/**
 * BharatPath — Application Detail Route
 * Detail & tracking view matching Screen 39 in Handoff & Screenshot 1.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ApplicationDetailScreen } from '@/screens/board/ApplicationDetailScreen';

export default function ApplicationDetailRoute() {
  const router = useRouter();

  return (
    <ApplicationDetailScreen
      roleTitle="Quality Trainee"
      companyName="Aurum Labs"
      companyInitials="AT"
      locationAndSalary="Baner, Pune · ₹19k–25k"
      interviewTime="Tomorrow, 11:00 am"
      interviewDesc="Video call, about 30 minutes, with Meera Kulkarni (Lab Head)."
      onBack={() => router.back()}
      onJoinCall={() => {
        Alert.alert(
          'Join Interview',
          'Connecting to secure video interview with Meera Kulkarni...',
          [{ text: 'OK' }]
        );
      }}
      onReschedule={() => {
        Alert.alert(
          'Reschedule Interview',
          'A reschedule request will be sent to the hiring manager at Aurum Labs.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request', onPress: () => Alert.alert('Request Sent', 'The team has been notified.') },
          ]
        );
      }}
      onWithdraw={() => {
        Alert.alert(
          'Withdraw Application',
          'Are you sure you want to withdraw your application for Quality Trainee at Aurum Labs?',
          [
            { text: 'Keep Application', style: 'cancel' },
            {
              text: 'Withdraw',
              style: 'destructive',
              onPress: () => {
                Alert.alert('Application Withdrawn', 'Your application has been withdrawn.');
                router.back();
              },
            },
          ]
        );
      }}
    />
  );
}
