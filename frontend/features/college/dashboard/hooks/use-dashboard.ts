"use client";

import { useMemo } from "react";

import { useGetCohortOverviewQuery } from "@/store/college/analytics/analytics.api";
import { useGetReferralCodesQuery } from "@/store/college/students/students.api";
import { useGetCollegeSeatsQuery } from "@/store/college/settings/settings.api";

import type {
  CohortOverview,
  ReferralCode,
  ScoreDistribution,
} from "@/store/college/types";

import type { CollegeDashboardView, DashboardBand } from "../types";

function bandsFrom(
  distribution: ScoreDistribution | null,
): DashboardBand[] {
  return [
    { label: "Entry", count: distribution?.entry ?? null },
    { label: "Developing", count: distribution?.developing ?? null },
    { label: "Solid", count: distribution?.solid ?? null },
    { label: "Strong", count: distribution?.strong ?? null },
  ];
}

/*
 * The most useful code to surface is the newest one a student can still act
 * on. Fall back to nothing rather than showing an expired or revoked code.
 */
function activeReferralCode(codes: ReferralCode[]): string | null {
  const active = codes.find((code) => code.state === "ACTIVE");
  return active?.code ?? null;
}

function toView(
  overview: CohortOverview | undefined,
  seats: { allocated: number; used: number; available: number; subscriptionActive: boolean } | undefined,
  referralCodes: ReferralCode[],
): CollegeDashboardView {
  return {
    connectedStudents: overview?.connectedStudents ?? 0,
    individuallyVisible: overview?.individuallyVisible ?? 0,
    medianScore: overview?.medianScore ?? null,
    platformHires: overview?.platformHires ?? null,
    applicants: overview?.applicants ?? null,
    applications: overview?.applications ?? null,
    interviews: overview?.interviews ?? null,
    belowFloor: overview?.belowFloor ?? false,
    minCohortSize: overview?.minCohortSize ?? 0,
    bands: bandsFrom(overview?.scoreDistribution ?? null),

    referralCode: activeReferralCode(referralCodes),

    seatsUsed: seats?.used ?? 0,
    seatsTotal: seats?.allocated ?? 0,
    seatsAvailable: seats?.available ?? 0,
    subscriptionActive: seats?.subscriptionActive ?? false,
  };
}

/*
 * Single source of truth for the college dashboard. Everything is served from
 * the backend through RTK Query — cohort analytics, seat usage and the live
 * referral codes.
 */
export function useDashboard() {
  const overviewQuery = useGetCohortOverviewQuery();
  const seatsQuery = useGetCollegeSeatsQuery();
  const referralCodesQuery = useGetReferralCodesQuery();

  const data = useMemo<CollegeDashboardView>(
    () =>
      toView(
        overviewQuery.data,
        seatsQuery.data ?? undefined,
        referralCodesQuery.data ?? [],
      ),
    [overviewQuery.data, seatsQuery.data, referralCodesQuery.data],
  );

  return {
    data,
    isLoading:
      overviewQuery.isLoading ||
      seatsQuery.isLoading ||
      referralCodesQuery.isLoading,
    isLoadingOverview: overviewQuery.isLoading,
    isLoadingSeats: seatsQuery.isLoading || seatsQuery.isFetching,
    isLoadingReferralCodes: referralCodesQuery.isLoading,
    isError:
      overviewQuery.isError ||
      seatsQuery.isError ||
      referralCodesQuery.isError,
  };
}
