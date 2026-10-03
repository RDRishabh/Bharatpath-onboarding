/**
 * BharatPath Design Tokens
 * Centralized source of truth for all colors, typography, spacing, radii, and shadows.
 * No component should hardcode colors or spacing - everything flows from here.
 */

// ─── BRAND COLORS ──────────────────────────────────────────────
export const Colors = {
  // Primary surfaces
  offWhite: '#FFFCF7', // 60% - primary application background
  navy: '#0A1931', // 25% - primary trust / headline / text
  brandAccent: '#5F4DB2', // primary brand action / progress / interactive accent
  purple: '#5F4DB2', // primary brand accent purple
  indigo: '#5E4DB2', // rich purple hero surface
  accentPurple: '#5F4DB2', // vibrant purple interactive accent
  heroPurple: '#5E4DB2', // hero card background
  gold: '#B9891A', // refined gold accent on cream
  goldWarm: '#F4D685', // warm gold on navy/purple
  goldDeep: '#8A6A12', // deep gold text/badge variant

  // Text
  text: {
    primary: '#3A4761', // body text on light backgrounds
    muted: '#5F6B80', // muted text on light backgrounds
    onNavy: '#FFFFFF', // primary text on navy
    mutedOnNavy: '#9DA9BE', // muted text on navy
  },

  // Surfaces & borders
  surface: {
    card: '#FFFFFF', // card background
    tint: '#F7F4EC', // subtle warm tint for sections
    border: '#E7E0D4', // card border
    borderSecondary: '#DDD6C7', // secondary action / pill border
    hairline: '#F0EBDF', // thin dividers
    overlay: 'rgba(10, 25, 49, 0.22)', // shadow color
  },

  // Semantic - green (success / match)
  green: {
    fg: '#1F6B45',
    bg: '#E6F1EA',
  },

  // Semantic - amber (warning / expiring)
  amber: {
    fg: '#7A5C0E',
    bg: '#F7EFD6',
  },

  // Semantic - indigo (progress / info)
  indigoSemantic: {
    fg: '#4A3E8F',
    bg: '#F1EAF7',
  },

  // Semantic - red (error / expired)
  red: {
    fg: '#993A22',
    bg: '#F8E6E0',
  },

  // Navigation
  nav: {
    activeBg: '#F1EAF7', // indigo tint for active tab
    activeFg: '#0A1931', // navy for active label/icon
    inactiveFg: '#5F6B80', // muted for inactive
  },

  // Buttons
  button: {
    primaryBg: '#5F4DB2', // Vibrant brand accent CTA
    primaryText: '#FFFFFF',
    primaryNavyBg: '#0A1931',
    primaryNavyText: '#FFFCF7',
    secondaryBg: '#FFFFFF',
    secondaryBorder: '#DDD6C7',
    secondaryText: '#0A1931',
  },
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────────
export type FontFamily =
  | 'GeneralSans-Regular'
  | 'GeneralSans-Medium'
  | 'GeneralSans-Semibold'
  | 'GeneralSans-Bold'
  | 'SpaceMono-Regular'
  | 'SpaceMono-Bold'
  | 'NotoSansDevanagari-Regular'
  | 'NotoSansDevanagari-Medium';

export const Typography = {
  // Display - large computed scores
  displayScore: {
    fontFamily: 'SpaceMono-Bold' as FontFamily,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },

  // Screen titles
  screenTitle: {
    fontFamily: 'GeneralSans-Semibold' as FontFamily,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  // Section / card titles
  cardTitle: {
    fontFamily: 'GeneralSans-Semibold' as FontFamily,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },

  // Body text
  body: {
    fontFamily: 'GeneralSans-Regular' as FontFamily,
    fontSize: 15,
    lineHeight: 22,
  },

  // Body medium (slightly emphasized)
  bodyMedium: {
    fontFamily: 'GeneralSans-Medium' as FontFamily,
    fontSize: 15,
    lineHeight: 22,
  },

  // Captions
  caption: {
    fontFamily: 'GeneralSans-Regular' as FontFamily,
    fontSize: 14,
    lineHeight: 20,
  },

  // Mono eyebrow - uppercase labels above sections
  monoEyebrow: {
    fontFamily: 'SpaceMono-Bold' as FontFamily,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
  },

  // Mono metadata - counters, IDs, timestamps
  monoMeta: {
    fontFamily: 'SpaceMono-Regular' as FontFamily,
    fontSize: 11,
    lineHeight: 16,
  },

  // Mono numbers - scores, monetary values
  monoNumber: {
    fontFamily: 'SpaceMono-Bold' as FontFamily,
    fontSize: 16,
    lineHeight: 22,
  },

  // Button text
  button: {
    fontFamily: 'GeneralSans-Semibold' as FontFamily,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // Chip text
  chip: {
    fontFamily: 'SpaceMono-Bold' as FontFamily,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Tab label
  tabLabel: {
    fontFamily: 'GeneralSans-Medium' as FontFamily,
    fontSize: 11,
    lineHeight: 14,
  },
} as const;

// ─── SPACING (4px system) ─────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 40,
  // Optical values
  opt6: 6,
  opt10: 10,
  opt14: 14,
  opt18: 18,
} as const;

// ─── RADII ─────────────────────────────────────────────────────
export const Radii = {
  pill: 999,
  card: 22,
  cardLg: 24,
  sheet: 28,
  input: 16,
  tile: 16,
  iconWell: 13,
  iconWellLg: 14,
  none: 0,
} as const;

// ─── SHADOWS ───────────────────────────────────────────────────
// Only one major shadow - reserved for the floating bottom navigation.
export const Shadows = {
  bottomNav: {
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 8,
  },
} as const;

// ─── LAYOUT CONSTANTS ──────────────────────────────────────────
export const Layout = {
  screenPaddingTop: 72,
  screenPaddingHorizontal: 20,
  screenPaddingBottom: 40,
  hubTopSpacing: 72,
  hubSectionPaddingHorizontal: 20,
  heroTopPadding: 62,
  heroBottomPadding: 26,
  heroHorizontalPadding: 20,
  sheetOverlap: 16,
  sheetTopRadius: 28,
  bottomNavHeight: 64,
  bottomNavRadius: 22,
  bottomNavMarginHorizontal: 16,
  bottomNavMarginBottom: 12,
  minTouchTarget: 44,
  maxContentWidth: 480,
} as const;

// ─── FONT WEIGHT HELPERS ───────────────────────────────────────
export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;
