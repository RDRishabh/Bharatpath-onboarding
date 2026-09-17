import type { Notification } from "./types/notification.types";

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "mock-1",
    type: "STUDENT_LINKED",
    title:
      "14 students linked using your referral code",
    message: null,
    timestamp: new Date(
      Date.now() - 3 * 60 * 60 * 1000,
    ).toISOString(),
    read: false,
    href: "/students",
  },

  {
    id: "mock-2",
    type: "CONSENT_PENDING",
    title:
      "21 students have not confirmed consent yet",
    message: null,
    timestamp: new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString(),
    read: false,
    href: "/students",
  },

  {
    id: "mock-3",
    type: "PAYMENT",
    title:
      "Seat payment invoice BP-INV-2026-114 generated",
    message: null,
    timestamp: new Date(
      Date.now() - 4 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    read: true,
    href: "/settings/billing",
  },

  {
    id: "mock-4",
    type: "ROSTER",
    title:
      "Roster upload processed · 62 rows, 3 duplicates skipped",
    message: null,
    timestamp: new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString(),
    read: false,
    href: "/students",
  },

  {
    id: "mock-5",
    type: "HIRING",
    title:
      "A. Kulkarni was hired for Lab Analyst Trainee",
    message: null,
    timestamp: new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    read: true,
    href: "/students",
  },
];