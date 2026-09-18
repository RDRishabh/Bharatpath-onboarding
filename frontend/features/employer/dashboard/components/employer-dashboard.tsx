"use client";

import { useRouter } from "next/navigation";

import { useDashboard } from "../hooks/use-dashboard";
import { usePageHeader } from "@/components/layout/header-context";
import {
  CardSkeletonGrid,
  Skeleton,
} from "@/components/common/loading";

import { DashboardStats } from "./dashboard-stats";
import { QuickActions } from "./quick-actions";
import { TopJobs } from "./top-jobs";
import { EmployerRecentActivity } from "./employer-recent-activity";

export function EmployerDashboard() {
  const router = useRouter();

  usePageHeader(
    "Dashboard",
    "Overview of your hiring activity and account status",
  );

  const { data, isLoading, error } = useDashboard();

  /*
   * ==========================================
   * LOADING STATE
   * ==========================================
   */

  if (isLoading) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* Stats */}
        <CardSkeletonGrid count={4} />

        {/* Main dashboard */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]">
          <Skeleton height={300} radius={12} />
          <Skeleton height={520} radius={12} />
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * ERROR STATE
   * ==========================================
   */

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
        <p className="text-sm font-medium text-[#111827]">
          Unable to load dashboard.
        </p>

        <p className="mt-1 text-sm text-[#64748b]">
          Please try again.
        </p>
      </div>
    );
  }

  /*
   * ==========================================
   * DASHBOARD
   * ==========================================
   */

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* ========================================
          STATS
          4 columns from 1024px+
      ======================================== */}

      <DashboardStats stats={data.stats} />

      {/* ========================================
          MAIN CONTENT

          Left:
          - Quick Actions
          - Top Jobs

          Right:
          - Recent Activity

          Two-column layout from 1024px+
      ======================================== */}

      <div
        className="
          grid
          min-w-0
          grid-cols-1
          gap-4
          lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]
        "
      >
        {/* LEFT COLUMN */}

        <div className="flex min-w-0 flex-col gap-4">
          <QuickActions
            onPostJob={() =>
              router.push("/employer/jobs/create")
            }
            onSearchCandidates={() =>
              router.push("/employer/candidates")
            }
            onReviewApplications={() =>
              router.push("/employer/applications")
            }
          />

          <TopJobs
            jobs={data.topJobs}
            onJobClick={(jobId) =>
              router.push(
                `/employer/jobs/${jobId}`,
              )
            }
          />
        </div>

        {/* RIGHT COLUMN */}

        <EmployerRecentActivity
          activities={data.recentActivity}
        />
      </div>
    </div>
  );
}