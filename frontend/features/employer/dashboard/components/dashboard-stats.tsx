import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarCheck,
  ListChecks,
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Active jobs"
        value={stats.activeJobs}
        icon={BriefcaseBusiness}
        tone="blue"
      />

      <MetricCard
        title="Applicants in pipeline"
        value={stats.applicantsInPipeline}
        icon={ListChecks}
        tone="green"
      />

      <MetricCard
        title="Interviews in progress"
        value={stats.interviewsInProgress}
        icon={CalendarCheck}
        tone="orange"
      />

      <MetricCard
        title="Access ends"
        value={stats.accessEnds ?? "—"}
        icon={CalendarDays}
        tone="purple"
        status={stats.hasAccess ? "Active access" : "No active access"}
        statusTone={stats.hasAccess ? "success" : "warning"}
      />
    </div>
  );
}