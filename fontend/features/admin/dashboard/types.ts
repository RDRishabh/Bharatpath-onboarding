import type { LucideIcon } from "lucide-react";

export type DashboardMetric = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  tone: "purple" | "amber" | "red" | "navy";
  status: string;
  statusTone: "success" | "warning" | "neutral";
  href: string;
};

export type OldestItem = {
  name: string;
  meta: string;
  initials: string;
  type: "KYB" | "Integrity";
  risk: "High" | "Medium" | "Low";
  waiting: string;
};

export type PlatformTotal = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconWrapper: string;
  iconColor: string;
};

export type IntakeClearedItem = {
  day: string;
  intake: number;
  cleared: number;
  intakeHeight: number;
  clearedHeight: number;
};