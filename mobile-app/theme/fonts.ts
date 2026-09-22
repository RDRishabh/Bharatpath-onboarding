/**
 * Font configuration for BharatPath.
 * Loads clean, balanced Inter typeface (used in UI design) alongside Space Mono
 * and Noto Sans Devanagari from local assets via expo-font.
 */

import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { SplashScreen } from 'expo-router';

export const customFonts = {
  // Primary App Sans Typeface (Inter matching the UI Design)
  'GeneralSans-Regular': require('../assets/fonts/Inter-Regular.ttf'),
  'GeneralSans-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  'GeneralSans-Semibold': require('../assets/fonts/Inter-SemiBold.ttf'),
  'GeneralSans-Bold': require('../assets/fonts/Inter-Bold.ttf'),

  // Direct Inter Family
  'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),

  // Space Mono
  'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),

  // Noto Sans Devanagari
  'NotoSansDevanagari-Regular': require('../assets/fonts/NotoSansDevanagari-Regular.ttf'),
  'NotoSansDevanagari-Medium': require('../assets/fonts/NotoSansDevanagari-Medium.ttf'),

  // Aliases for cross-component compatibility
  'GeneralSans': require('../assets/fonts/Inter-Regular.ttf'),
  'Inter': require('../assets/fonts/Inter-Regular.ttf'),
  'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
};

export const fontConfig = {
  fonts: customFonts,
};

export function useBharatPathFonts() {
  const [fontsLoaded, fontError] = useFonts(customFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError };
}
