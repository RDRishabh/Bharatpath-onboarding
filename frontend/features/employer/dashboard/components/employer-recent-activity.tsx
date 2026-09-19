import { RecentActivityList } from "@/components/common/dashboard/recent-activity";

import type { RecentActivity } from "../types";

interface EmployerRecentActivityProps {
  activities: RecentActivity[];
}

export function EmployerRecentActivity({
  activities,
}: EmployerRecentActivityProps) {
  return <RecentActivityList activities={activities} />;
}