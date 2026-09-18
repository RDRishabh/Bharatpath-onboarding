/*
 * Analytics view model.
 *
 * Everything here is derived from the real cohort-overview and placement-report
 * endpoints plus live seat usage. Where a figure is withheld — a cohort or a
 * placement cell below the privacy floor — the value is `null` and the UI shows
 * a neutral placeholder rather than a fabricated number.
 */

export interface AnalyticsMetric {
  id: string;
  value: string | number;
  label: string;
}

export interface MonthPlacement {
  month: string;
  hires: number;
}

export interface LocationPlacement {
  location: string;
  hires: number;
}

export interface CollegeAnalyticsView {
  seatsUsed: number;
  seatsTotal: number;

  cohortBelowFloor: boolean;
  minCohortSize: number;
  metrics: AnalyticsMetric[];

  placementsBelowFloor: boolean;
  totalHires: number | null;
  placementsByMonth: MonthPlacement[];
  placementsByLocation: LocationPlacement[];
}
