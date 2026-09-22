/**
 * Shared utility helpers for BharatPath.
 */

import { StyleProp, ViewStyle } from 'react-native';

/** Combine multiple style objects, skipping falsy values. */
export function cn<T = ViewStyle>(...styles: (false | null | undefined | T)[]): StyleProp<T> {
  const valid = styles.filter(Boolean) as T[];
  return valid.length > 0 ? (valid.length === 1 ? valid[0] : Object.assign({}, ...valid)) : undefined;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Format a number with Indian locale (e.g. 1,25,000). */
export function formatIndianNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

/** Format a monetary value in INR with the ₹ symbol. */
export function formatINR(value: number): string {
  return `₹${formatIndianNumber(value)}`;
}

/** Return initials from a company or person name (max 2 chars). */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Convert a hex color (#RRGGBB) to an rgba string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Deterministic color pick from a string (for company monogram backgrounds). */
export function pickFromString<T>(str: string, options: T[]): T {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return options[Math.abs(hash) % options.length];
}
