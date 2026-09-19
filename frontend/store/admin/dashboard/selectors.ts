import type { RootState } from "@/store";

export const selectAdminDashboard = (
  state: RootState,
) => state.admin.dashboard;

export const selectDashboardMetrics = (
  state: RootState,
) => state.admin.dashboard.metrics;

export const selectOldestItems = (
  state: RootState,
) => state.admin.dashboard.oldestItems;

export const selectPlatformTotals = (
  state: RootState,
) => state.admin.dashboard.platformTotals;

export const selectIntakeCleared = (
  state: RootState,
) => state.admin.dashboard.intakeCleared;