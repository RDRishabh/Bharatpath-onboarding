import type { StudentNotification, AddOnCard } from "../types";

/*
 * ==========================================================================
 * MOCK — notifications + the two "go further" add-ons.
 *
 * The candidate only ever hears about three things: an employer opened their
 * profile, an application moved forward, or a near-miss job opened.
 * ==========================================================================
 */

export const studentNotifications: StudentNotification[] = [
  {
    id: "notif-1",
    type: "view",
    title: "An employer opened your profile",
    description: "Sterling Diagnostics viewed your profile for Lab Analyst Trainee.",
    time: "2h ago",
    read: false,
  },
  {
    id: "notif-2",
    type: "application",
    title: "Your application moved forward",
    description: "Aurum Labs moved you to Interview for Quality Trainee.",
    time: "5h ago",
    read: false,
  },
  {
    id: "notif-3",
    type: "job",
    title: "A job you nearly qualify for opened",
    description: "Quality Control Trainee at Novacare Foods — 14 points short.",
    time: "1d ago",
    read: false,
  },
  {
    id: "notif-4",
    type: "application",
    title: "Your application was received",
    description: "Prisma Health received your application for Microbiology Assistant.",
    time: "3d ago",
    read: true,
  },
  {
    id: "notif-5",
    type: "system",
    title: "Your score is saved",
    description: "Your resume score of 706 is saved to your profile.",
    time: "5d ago",
    read: true,
  },
];

export const addOnCards: AddOnCard[] = [
  {
    id: "addon-attribute",
    key: "attribute",
    title: "Attribute check",
    subtitle: "24 questions · 6 min",
    priceLabel: "Free",
    isFree: true,
    tint: "#DDD6F2",
    border: "#CDC4EA",
  },
  {
    id: "addon-interview",
    key: "interview",
    title: "Mock interview",
    subtitle: "6 questions · 15 min",
    priceLabel: "₹299",
    isFree: false,
    tint: "#CFD8ED",
    border: "#BDC8E3",
  },
];
