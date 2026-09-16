"use client";

import { usePageHeader } from "@/components/layout/header-context";

import {
  ApplicationsPageContent,
} from "@/features/employer/applications";

export default function ApplicationsPage() {
  usePageHeader(
    "Applications",
    "Track applicants through your hiring pipeline",
  );

  return <ApplicationsPageContent />;
}