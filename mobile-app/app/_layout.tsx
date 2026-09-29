import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useBharatPathFonts } from '@/theme/fonts';
import { injectWebFonts } from '@/theme/webFonts';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { configureNotificationPresentation } from '@/services/notifications/device';

export default function RootLayout() {
  const { fontsLoaded, fontError } = useBharatPathFonts();

  useEffect(() => {
    injectWebFonts();
    // Foreground notifications must explicitly opt into a banner/list entry.
    configureNotificationPresentation();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="attribute-check" />
          <Stack.Screen name="attribute-quiz" />
          <Stack.Screen name="attribute-report" />
          <Stack.Screen name="mock-interview" />
          <Stack.Screen name="device-check" />
          <Stack.Screen name="interview-session" />
          <Stack.Screen name="interview-report" />
          <Stack.Screen name="jobs" />
          <Stack.Screen name="job-detail" />
          <Stack.Screen name="application-sent" />
          <Stack.Screen name="board" />
          <Stack.Screen name="application-detail" />
          <Stack.Screen name="you" />
          <Stack.Screen name="who-has-seen-me" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" />
      </AppProvider>
    </AuthProvider>
  );
}
