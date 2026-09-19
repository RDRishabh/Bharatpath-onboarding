"use client";

import type { DashboardMetric, OldestDashboardItem, PlatformTotal } from "@/store/admin/dashboard/slice";
import {
  useGetAdminDisputesQuery,
  useGetAdminIntegritySignalsQuery,
  useGetAdminKybSubmissionsQuery,
  useGetAdminTenantsQuery,
} from "@/store/api/admin-api";

function count(value: number, hasMore: boolean) {
  return hasMore ? `${value}+` : value;
}

function waiting(value: string) {
  const hours = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 3_600_000);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export function useDashboard() {
  const kyb = useGetAdminKybSubmissionsQuery({ state: "SUBMITTED", limit: 100 });
  const integrity = useGetAdminIntegritySignalsQuery({ state: "OPEN", limit: 100 });
  const disputes = useGetAdminDisputesQuery({ limit: 100 });
  const employers = useGetAdminTenantsQuery({ type: "EMPLOYER", status: "ACTIVE", limit: 100 });
  const colleges = useGetAdminTenantsQuery({ type: "COLLEGE", limit: 100 });

  const metrics: DashboardMetric[] = [
    { title: "KYB awaiting review", value: count(kyb.data?.items.length ?? 0, Boolean(kyb.data?.next_cursor)), tone: "purple", status: kyb.data?.review_required ? "Manual review enabled" : "Automatic approval", statusTone: "neutral" },
    { title: "Integrity flags", value: count(integrity.data?.items.length ?? 0, Boolean(integrity.data?.next_cursor)), tone: "amber", status: "Open signals", statusTone: "warning" },
    { title: "Open disputes", value: count(disputes.data?.items.length ?? 0, Boolean(disputes.data?.next_cursor)), tone: "red", status: "Needs action", statusTone: "neutral" },
    { title: "Active employers", value: count(employers.data?.items.length ?? 0, Boolean(employers.data?.next_cursor)), tone: "navy", status: "Current page count", statusTone: "neutral" },
  ];

  const oldestItems: OldestDashboardItem[] = [
    ...(kyb.data?.items ?? []).map((item) => ({
      createdAt: item.submitted_at ?? item.created_at,
      value: { name: item.organisation, meta: item.state.replaceAll("_", " "), initials: item.organisation.slice(0, 2).toUpperCase(), type: "KYB" as const, risk: item.auto_approved ? "Low" as const : "Medium" as const, waiting: waiting(item.submitted_at ?? item.created_at) },
    })),
    ...(integrity.data?.items ?? []).map((item) => ({
      createdAt: item.created_at,
      value: { name: `Candidate · ${item.candidate_id.slice(0, 8)}`, meta: item.rule_id.replaceAll("_", " "), initials: "CA", type: "Integrity" as const, risk: `${item.severity[0]}${item.severity.slice(1).toLowerCase()}` as OldestDashboardItem["risk"], waiting: waiting(item.created_at) },
    })),
  ].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(0, 5).map((item) => item.value);

  const platformTotals: PlatformTotal[] = [
    { label: "Candidates", value: "Unavailable" },
    { label: "Employers", value: String(count(employers.data?.items.length ?? 0, Boolean(employers.data?.next_cursor))) },
    { label: "Institutions", value: String(count(colleges.data?.items.length ?? 0, Boolean(colleges.data?.next_cursor))) },
  ];

  return {
    metrics,
    oldestItems,
    platformTotals,
    intakeCleared: [],
    isLoading: kyb.isLoading || integrity.isLoading || disputes.isLoading || employers.isLoading || colleges.isLoading,
    error: kyb.error || integrity.error || disputes.error || employers.error || colleges.error,
  };
}