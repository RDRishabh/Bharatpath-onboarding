"use client";

import type {
  DashboardMetric,
  IntakeClearedItem,
  OldestDashboardItem,
  PlatformTotal,
} from "@/store/admin/dashboard/slice";
import {
  useGetAdminDashboardQuery,
  type AdminDashboardResponse,
  type AdminOldestWaitingItem,
} from "@/store/api/admin-api";

const EMPTY_METRICS: DashboardMetric[] = [];
const EMPTY_OLDEST: OldestDashboardItem[] = [];
const EMPTY_TOTALS: PlatformTotal[] = [];
const EMPTY_INTAKE: IntakeClearedItem[] = [];

/*
 * "2h", "3d", or "just now" from an ISO timestamp — how long an item has been
 * waiting in a queue, computed on the client from the server's timestamp.
 */
function waitingFor(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "—";
  }
  const hours = Math.floor(Math.max(0, Date.now() - then) / 3_600_000);
  if (hours < 1) {
    return "just now";
  }
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

function initialsOf(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function typeOf(
  queue: AdminOldestWaitingItem["queue"],
): OldestDashboardItem["type"] {
  if (queue === "KYB") {
    return "KYB";
  }
  if (queue === "DISPUTE") {
    return "Dispute";
  }
  return "Integrity";
}

function riskOf(
  severity: AdminOldestWaitingItem["severity"],
): OldestDashboardItem["risk"] {
  if (severity === "HIGH") {
    return "High";
  }
  if (severity === "MEDIUM") {
    return "Medium";
  }
  return "Low";
}

function toMetrics(data: AdminDashboardResponse): DashboardMetric[] {
  const { kyb, integrity, disputes, organisations } = data;

  return [
    {
      title: "KYB awaiting review",
      value: kyb.awaiting_review,
      tone: "purple",
      status: kyb.review_required
        ? "Manual review enabled"
        : "Automatic approval",
      statusTone: "neutral",
    },
    {
      title: "Integrity flags",
      value: integrity.open,
      tone: "amber",
      status:
        integrity.candidates_held_back > 0
          ? `${integrity.candidates_held_back} held back`
          : "None held back",
      statusTone: integrity.candidates_held_back > 0 ? "warning" : "neutral",
    },
    {
      title: "Open disputes",
      value: disputes.open,
      tone: "red",
      status:
        disputes.unassigned > 0
          ? `${disputes.unassigned} unassigned`
          : "All assigned",
      statusTone: disputes.unassigned > 0 ? "warning" : "neutral",
    },
    {
      title: "Active employers",
      value: organisations.employers.active,
      tone: "navy",
      status:
        organisations.employers.suspended > 0
          ? `${organisations.employers.suspended} suspended`
          : "None suspended",
      statusTone: "neutral",
    },
  ];
}

function toOldestItems(
  items: AdminOldestWaitingItem[],
): OldestDashboardItem[] {
  return items.map((item) => ({
    name: item.label,
    meta: item.detail ?? "",
    initials: initialsOf(item.label) || "—",
    type: typeOf(item.queue),
    risk: riskOf(item.severity ?? null),
    waiting: waitingFor(item.waiting_since),
  }));
}

function toPlatformTotals(
  totals: AdminDashboardResponse["platform_totals"],
): PlatformTotal[] {
  return [
    { label: "Candidates", value: String(totals.candidates) },
    { label: "Employers", value: String(totals.employers) },
    { label: "Institutions", value: String(totals.colleges) },
    { label: "Published jobs", value: String(totals.published_jobs) },
    { label: "Applications", value: String(totals.applications) },
    { label: "Confirmed hires", value: String(totals.confirmed_hires) },
  ];
}

function toIntakeCleared(
  throughput: AdminDashboardResponse["throughput"],
): IntakeClearedItem[] {
  const maxValue = Math.max(
    1,
    ...throughput.map((point) => Math.max(point.entered, point.cleared)),
  );

  return throughput.map((point) => {
    const parsed = new Date(point.date);
    const day = Number.isNaN(parsed.getTime())
      ? point.date
      : parsed.toLocaleDateString("en-IN", { day: "numeric" });

    return {
      day,
      intake: point.entered,
      cleared: point.cleared,
      intakeHeight: (point.entered / maxValue) * 100,
      clearedHeight: (point.cleared / maxValue) * 100,
    };
  });
}

/*
 * The operations dashboard is served by one audited request,
 * GET /api/v1/admin/dashboard, mapped here into the shapes each panel renders.
 */
export function useDashboard() {
  const { data, isLoading, isFetching, error, refetch } =
    useGetAdminDashboardQuery();

  return {
    metrics: data ? toMetrics(data) : EMPTY_METRICS,
    oldestItems: data ? toOldestItems(data.oldest_waiting) : EMPTY_OLDEST,
    platformTotals: data ? toPlatformTotals(data.platform_totals) : EMPTY_TOTALS,
    intakeCleared: data ? toIntakeCleared(data.throughput) : EMPTY_INTAKE,
    isLoading: isLoading || isFetching,
    error,
    refetch,
  };
}