import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useBharatPathFonts } from '@/theme/fonts';
import { injectWebFonts } from '@/theme/webFonts';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';

export default function RootLayout() {
  const { fontsLoaded } = useBharatPathFonts();

  useEffect(() => {
    injectWebFonts();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="jobs" />
          <Stack.Screen name="board" />
          <Stack.Screen name="you" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" />
      </AppProvider>
    </AuthProvider>
  );
}
