/**
 * Font configuration for BharatPath.
 * Uses Google Fonts loaded via expo-google-fonts packages.
 * General Sans → Space Mono → Noto Sans Devanagari fallback chain.
 */

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
} from '@expo-google-fonts/noto-sans-devanagari';
import { useEffect } from 'react';
import { SplashScreen } from 'expo-router';

export const fontConfig = {
  fonts: {
    'GeneralSans-Regular': Inter_400Regular,
    'GeneralSans-Medium': Inter_500Medium,
    'GeneralSans-Semibold': Inter_600SemiBold,
    'GeneralSans-Bold': Inter_700Bold,
    'SpaceMono-Regular': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
    'NotoSansDevanagari-Regular': NotoSansDevanagari_400Regular,
    'NotoSansDevanagari-Medium': NotoSansDevanagari_500Medium,
  },
};

export function useBharatPathFonts() {
  const [fontsLoaded, fontError] = useFonts(fontConfig.fonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError };
}
