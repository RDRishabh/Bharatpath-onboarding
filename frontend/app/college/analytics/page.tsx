import { analyticsService } from "@/features/college/analytics/services/analytics.service";
import { AnalyticsDashboard } from "@/features/college/analytics/components/analytics-dashboard";

export default async function AnalyticsPage() {
  const data =
    await analyticsService.getAnalytics();

  return (
    <AnalyticsDashboard data={data} />
  );
}