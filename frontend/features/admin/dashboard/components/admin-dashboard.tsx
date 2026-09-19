"use client";

import { usePageHeader } from "@/components/layout/header-context";

import {
  DashboardMetrics,
  IntakeClearedChart,
  OldestItems,
  PlatformTotals,
} from "./index";

import { useDashboard } from "../hooks/use-dashboard";
import { CardSkeletonGrid, ListSkeleton } from "@/components/common/loading";

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
    isLoading,
    error,
  } = useDashboard();

  return (
    <div className="min-w-0 space-y-5">
      {/* ================================================================ */}
      {/* Metrics                                                          */}
      {/* ================================================================ */}

      {isLoading ? <CardSkeletonGrid count={4} /> : <DashboardMetrics metrics={metrics} />}
      {error ? <p className="rounded-lg border border-[#f0c8cc] bg-[#fff7f7] p-3 text-[12px] text-[#9f2432]" role="alert">Some dashboard data could not be loaded.</p> : null}

      {/* ================================================================ */}
      {/* Main content                                                     */}
      {/* ================================================================ */}

      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* ============================================================ */}
        {/* Oldest items                                                  */}
        {/* ============================================================ */}

        {isLoading ? <ListSkeleton rows={5} /> : <OldestItems items={oldestItems} />}

        {/* ============================================================ */}
        {/* Right column                                                  */}
        {/* ============================================================ */}

        <div className="flex min-w-0 flex-col gap-4">
          <PlatformTotals items={platformTotals} />

          {intakeCleared.length > 0 ? <IntakeClearedChart data={intakeCleared} /> : (
            <section className="rounded-[12px] border border-[#e5e7ec] bg-white p-5 text-[12px] text-[#777f90]">Historical intake and clearance metrics are not exposed by the Admin API.</section>
          )}
        </div>
      </div>
    </div>
  );
}