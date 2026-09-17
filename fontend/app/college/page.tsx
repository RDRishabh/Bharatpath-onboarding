import { dashboardService } from "@/features/college/dashboard/services/dashboard.service";
import { CollegeDashboard } from "@/features/college/dashboard/components/college-dashboard";

export default async function CollegeDashboardPage() {
  const data =
    await dashboardService.getDashboard();

  return <CollegeDashboard data={data} />;
}