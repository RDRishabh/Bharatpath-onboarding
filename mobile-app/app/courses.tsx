/**
 * BharatPath - Courses Catalogue Route
 * Displays all available skill courses from GET /candidate/courses
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { CoursesListScreen } from '@/screens/courses/CoursesListScreen';

export default function CoursesRoute() {
  const router = useRouter();

  return (
    <CoursesListScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/home');
      }}
    />
  );
}
