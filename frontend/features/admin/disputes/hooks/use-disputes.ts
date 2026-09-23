"use client";

import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  closeDispute,
  openDispute,
  setDisputeTab,
} from "@/store/admin/disputes/slice";

import {
  selectAdminDisputes,
} from "@/store/admin/disputes/selectors";

import {
  type AuditEventRow,
  type DisputeRow,
  useLazyGetAdminAuditEventsQuery,
  useGetAdminDisputesQuery,
} from "@/store/api/admin-api";
import {
  tablePagination,
  useCursorPagination,
} from "@/lib/pagination/use-cursor-pagination";
import { useCursorLoadMore } from "@/lib/pagination/use-cursor-load-more";

import type { AuditIcon, AuditItem, Dispute, DisputeStatus, DisputeTab } from "../types";

function age(value: string) {
  const hours = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 3_600_000);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

function status(value: DisputeRow["state"]): DisputeStatus {
  if (value === "IN_REVIEW") return "Investigating";
  return (value[0] + value.slice(1).toLowerCase()) as DisputeStatus;
}

function disputeView(item: DisputeRow): Dispute {
  return {
    id: item.id,
    title: `${item.kind[0]}${item.kind.slice(1).toLowerCase()} dispute`,
    parties: `${item.party} · ${item.tenant_id ?? item.raised_by}`,
    status: status(item.state),
    raised: new Date(item.created_at).toLocaleDateString(),
    age: age(item.created_at),
    claim: "Open this dispute to view the submitted claim.",
    evidence: [],
  };
}

function auditView(item: AuditEventRow): AuditItem {
  const icon: AuditIcon = item.action.includes("dispute") ? "gavel" : item.action.includes("integrity") ? "alert" : "check";
  return {
    id: String(item.id),
    description: `${item.action.replaceAll("_", " ")} · ${item.target_type}`,
    operator: item.actor_role,
    timestamp: new Date(item.occurred_at).toLocaleString(),
    icon,
  };
}

export function useDisputes() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminDisputes,
  );

  const openPage = useCursorPagination();
  const openQuery = useGetAdminDisputesQuery({
    limit: openPage.pageSize,
    cursor: openPage.cursor,
  });
  const resolvedQuery = useGetAdminDisputesQuery({ state: "RESOLVED", limit: 100 });
  const rejectedQuery = useGetAdminDisputesQuery({ state: "REJECTED", limit: 100 });
  const [fetchAudit] = useLazyGetAdminAuditEventsQuery();
  const audit = useCursorLoadMore<AuditEventRow>(
    useCallback(
      async (cursor) => {
        const page = await fetchAudit({ limit: 10, cursor }).unwrap();
        return { items: page.items, nextCursor: page.next_cursor };
      },
      [fetchAudit],
    ),
    [],
  );
  const openNextCursor = openQuery.data?.next_cursor ?? null;
  const openDisputes = (openQuery.data?.items ?? []).map(disputeView);
  const resolvedDisputes = [
    ...(resolvedQuery.data?.items ?? []),
    ...(rejectedQuery.data?.items ?? []),
  ].map(disputeView);
  const auditItems = audit.items.map(auditView);

  return {
    state,

    openDisputes,

    resolvedDisputes,

    auditItems,

    isLoading: openQuery.isLoading || resolvedQuery.isLoading || rejectedQuery.isLoading,

    auditLoading: audit.isLoading,

    auditLoadingMore: audit.isLoadingMore,

    auditHasMore: audit.hasMore,

    loadMoreAudit: audit.loadMore,

    error: openQuery.error || resolvedQuery.error || rejectedQuery.error,

    openCount: openDisputes.length,

    openHasMore: Boolean(openNextCursor),

    openPagination: tablePagination(openPage, openNextCursor),

    resolvedCount:
      resolvedDisputes.length,

    setTab: (tab: DisputeTab) => {
      dispatch(setDisputeTab(tab));
    },

    openDispute: (id: string) => {
      dispatch(openDispute(id));
    },

    closeDispute: () => {
      dispatch(closeDispute());
    },
  };
}