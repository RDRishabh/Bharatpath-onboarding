import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

export type DashboardMetricTone =
  | "purple"
  | "amber"
  | "red"
  | "navy";

export type DashboardStatusTone =
  | "success"
  | "warning"
  | "neutral";

export interface DashboardMetric {
  title: string;
  value: number;
  tone: DashboardMetricTone;
  status: string;
  statusTone: DashboardStatusTone;
}

export interface OldestDashboardItem {
  name: string;
  meta: string;
  initials: string;
  type: "KYB" | "Integrity";
  risk: "High" | "Medium" | "Low";
  waiting: string;
}

export interface PlatformTotal {
  label: "Candidates" | "Employers" | "Institutions";
  value: string;
}

export interface IntakeClearedItem {
  day: string;
  intake: number;
  cleared: number;
  intakeHeight: number;
  clearedHeight: number;
}

export interface AdminDashboardState {
  metrics: DashboardMetric[];
  oldestItems: OldestDashboardItem[];
  platformTotals: PlatformTotal[];
  intakeCleared: IntakeClearedItem[];
}

const initialState: AdminDashboardState = {
  /*
   * ========================================================================
   * Metrics
   * ========================================================================
   */

  metrics: [
    {
      title: "KYB awaiting review",
      value: 5,
      tone: "purple",
      status: "All within SLA",
      statusTone: "success",
    },
    {
      title: "Integrity flags",
      value: 3,
      tone: "amber",
      status: "1 escalated",
      statusTone: "warning",
    },
    {
      title: "Open disputes",
      value: 2,
      tone: "red",
      status: "Oldest 2 days",
      statusTone: "neutral",
    },
    {
      title: "Active employers",
      value: 148,
      tone: "navy",
      status: "+6 this week",
      statusTone: "success",
    },
  ],

  /*
   * ========================================================================
   * Oldest items
   * ========================================================================
   */

  oldestItems: [
    {
      name: "Sterling Diagnostics Pvt Ltd",
      meta: "GSTIN 27ABCDE1234F1Z5",
      initials: "SD",
      type: "KYB",
      risk: "Medium",
      waiting: "14h",
    },
    {
      name: "Nashik Pharma Works",
      meta: "GSTIN 27PQRST5678K2M1",
      initials: "NP",
      type: "KYB",
      risk: "Low",
      waiting: "11h",
    },
    {
      name: "Candidate · C218",
      meta: "Duplicate device fingerprint",
      initials: "C2",
      type: "Integrity",
      risk: "High",
      waiting: "8h",
    },
    {
      name: "Chakan Auto Components",
      meta: "GSTIN 27LMNOP9012J3H4",
      initials: "CA",
      type: "KYB",
      risk: "Low",
      waiting: "6h",
    },
    {
      name: "Candidate · C331",
      meta: "Score anomaly on retest",
      initials: "C3",
      type: "Integrity",
      risk: "Medium",
      waiting: "3h",
    },
  ],

  /*
   * ========================================================================
   * Platform totals
   * ========================================================================
   */

  platformTotals: [
    {
      label: "Candidates",
      value: "18,402",
    },
    {
      label: "Employers",
      value: "148",
    },
    {
      label: "Institutions",
      value: "26",
    },
  ],

  /*
   * ========================================================================
   * Intake vs cleared
   * ========================================================================
   */

  intakeCleared: [
    {
      day: "Mon",
      intake: 18,
      cleared: 21,
      intakeHeight: 69,
      clearedHeight: 81,
    },
    {
      day: "Tue",
      intake: 22,
      cleared: 24,
      intakeHeight: 85,
      clearedHeight: 92,
    },
    {
      day: "Wed",
      intake: 16,
      cleared: 19,
      intakeHeight: 62,
      clearedHeight: 73,
    },
    {
      day: "Thu",
      intake: 24,
      cleared: 26,
      intakeHeight: 92,
      clearedHeight: 100,
    },
    {
      day: "Fri",
      intake: 20,
      cleared: 22,
      intakeHeight: 77,
      clearedHeight: 85,
    },
  ],
};

const dashboardSlice = createSlice({
  name: "adminDashboard",

  initialState,

  reducers: {
    setDashboard(
      state,
      action: PayloadAction<AdminDashboardState>,
    ) {
      state.metrics = action.payload.metrics;
      state.oldestItems = action.payload.oldestItems;
      state.platformTotals =
        action.payload.platformTotals;
      state.intakeCleared =
        action.payload.intakeCleared;
    },

    setDashboardMetrics(
      state,
      action: PayloadAction<DashboardMetric[]>,
    ) {
      state.metrics = action.payload;
    },

    setOldestDashboardItems(
      state,
      action: PayloadAction<OldestDashboardItem[]>,
    ) {
      state.oldestItems = action.payload;
    },

    setPlatformTotals(
      state,
      action: PayloadAction<PlatformTotal[]>,
    ) {
      state.platformTotals = action.payload;
    },

    setIntakeCleared(
      state,
      action: PayloadAction<IntakeClearedItem[]>,
    ) {
      state.intakeCleared = action.payload;
    },
  },
});

export const {
  setDashboard,
  setDashboardMetrics,
  setOldestDashboardItems,
  setPlatformTotals,
  setIntakeCleared,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;