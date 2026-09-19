import {
  BriefcaseBusiness,
  IndianRupee,
  ListChecks,
  LockOpen,
} from "lucide-react";

import { MetricCard } from "@/components/common/dashboard/metric-card";

import type { EmployerDashboardStats } from "../types";

interface DashboardStatsProps {
  stats: EmployerDashboardStats;
}

export function DashboardStats({
  stats,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-4">
      <MetricCard
        title="Active jobs"
        value={stats.activeJobs}
        icon={BriefcaseBusiness}
        tone="blue"
      />

      <MetricCard
        title="Total applicants"
        value={stats.totalApplicants}
        icon={ListChecks}
        tone="green"
      />

      <MetricCard
        title="Candidates unlocked"
        value={stats.candidatesUnlocked}
        icon={LockOpen}
        tone="purple"
      />

      <MetricCard
        title="Credit balance"
        value={stats.creditBalance}
        icon={IndianRupee}
        tone="orange"
      />
    </div>
  );
}