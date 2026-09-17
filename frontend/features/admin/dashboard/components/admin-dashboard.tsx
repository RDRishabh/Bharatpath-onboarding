"use client";

import { usePageHeader } from "@/components/layout/header-context";

import {
  DashboardMetrics,
  IntakeClearedChart,
  OldestItems,
  PlatformTotals,
} from "./index";

import { useDashboard } from "../hooks/use-dashboard";

export function AdminDashboard() {
  usePageHeader(
    "Operations dashboard",
    "Monitor verification, integrity and platform activity from one place.",
  );

  const {
    metrics,
    oldestItems,
    platformTotals,
    intakeCleared,
  } = useDashboard();

  return (
    <div className="min-w-0 space-y-5">
      {/* ================================================================ */}
      {/* Metrics                                                          */}
      {/* ================================================================ */}

      <DashboardMetrics metrics={metrics} />

      {/* ================================================================ */}
      {/* Main content                                                     */}
      {/* ================================================================ */}

      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* ============================================================ */}
        {/* Oldest items                                                  */}
        {/* ============================================================ */}

        <OldestItems items={oldestItems} />

        {/* ============================================================ */}
        {/* Right column                                                  */}
        {/* ============================================================ */}

        <div className="flex min-w-0 flex-col gap-4">
          <PlatformTotals items={platformTotals} />

          <IntakeClearedChart data={intakeCleared} />
        </div>
      </div>
    </div>
  );
}