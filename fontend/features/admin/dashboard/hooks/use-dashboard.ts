"use client";

import { useAppSelector } from "@/store/hooks";

import {
  selectDashboardMetrics,
  selectIntakeCleared,
  selectOldestItems,
  selectPlatformTotals,
} from "@/store/admin/dashboard/selectors";

export function useDashboard() {
  const metrics = useAppSelector(
    selectDashboardMetrics,
  );

  const oldestItems = useAppSelector(
    selectOldestItems,
  );

  const platformTotals = useAppSelector(
    selectPlatformTotals,
  );

  const intakeCleared = useAppSelector(
    selectIntakeCleared,
  );

  return {
    metrics,
    oldestItems,
    platformTotals,
    intakeCleared,
  };
}