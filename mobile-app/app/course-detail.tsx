/**
 * BharatPath - Course Detail Route
 * Displays course syllabus, lessons, purchase checkout, and lesson player.
 */
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/tokens';
import { CourseDetailScreen } from '@/screens/courses/CourseDetailScreen';

export default function CourseDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const courseId = params.courseId;

  if (!courseId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No course selected.</Text>
        <Text style={styles.retryLink} onPress={() => router.back()}>
          Back to courses
        </Text>
      </View>
    );
  }

  return (
    <CourseDetailScreen
      courseId={courseId}
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/courses');
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF7',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.navy,
    textAlign: 'center',
  },
  retryLink: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#5F4DB2',
  },
});
