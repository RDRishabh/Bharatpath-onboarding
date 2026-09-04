/**
 * Web font CSS injection.
 * On web, expo-google-fonts loads fonts via @font-face. This helper ensures
 * the font-family names used in tokens resolve correctly on the web platform.
 * For native, expo-font handles the mapping automatically.
 */
import { Platform } from 'react-native';

const webFontCSS = `
@font-face {
  font-family: 'GeneralSans-Regular';
  src: local('Inter'), local('Inter Regular'), local('SF Pro Text'), local('Segoe UI'), local('Roboto');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'GeneralSans-Medium';
  src: local('Inter Medium'), local('Inter Medium'), local('SF Pro Text Medium'), local('Segoe UI Semibold'), local('Roboto Medium');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'GeneralSans-Semibold';
  src: local('Inter SemiBold'), local('Inter Semibold'), local('SF Pro Text Semibold'), local('Segoe UI Semibold'), local('Roboto');
  font-weight: 600;
  font-style: normal;
}
@font-face {
  font-family: 'GeneralSans-Bold';
  src: local('Inter Bold'), local('Inter Bold'), local('SF Pro Text Bold'), local('Segoe UI Bold'), local('Roboto Bold');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'SpaceMono-Regular';
  src: local('Space Mono'), local('Space Mono Regular'), local('Courier New'), local('monospace');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'SpaceMono-Bold';
  src: local('Space Mono Bold'), local('Courier New Bold'), local('monospace');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'NotoSansDevanagari-Regular';
  src: local('Noto Sans Devanagari'), local('Noto Sans Devanagari Regular');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'NotoSansDevanagari-Medium';
  src: local('Noto Sans Devanagari Medium');
  font-weight: 500;
  font-style: normal;
}
`;

export function injectWebFonts() {
  if (Platform.OS === 'web') {
    const styleId = 'bharatpath-web-fonts';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = webFontCSS;
      document.head.appendChild(style);
    }
  }
}
