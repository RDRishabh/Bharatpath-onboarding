"use client";

import { usePageHeader } from "@/components/layout/header-context";
import { Skeleton } from "@/components/common/loading";
import { ErrorState } from "@/components/ui";

import { useDisputes } from "../hooks/use-disputes";

import { AuditTrail } from "./audit-trail";
import { ClosedDisputesTab } from "./closed-disputes-tab";
import { DisputeDrawer } from "./dispute-drawer";
import { OpenDisputesTab } from "./open-disputes-tab";

export function DisputesPage() {
  usePageHeader(
    "Disputes & Audit",
    "Investigate disputes and trace every operator action",
  );

  const {
    state,
    openDisputes,
    resolvedDisputes,
    rejectedDisputes,
    auditItems,
    openLoading,
    resolvedLoading,
    rejectedLoading,
    auditLoading,
    auditLoadingMore,
    auditHasMore,
    loadMoreAudit,
    retryAudit,
    auditError,
    disputeError,
    retryDisputes,
    openCount,
    openHasMore,
    openPagination,
    resolvedCount,
    resolvedHasMore,
    resolvedPagination,
    rejectedCount,
    rejectedHasMore,
    rejectedPagination,
    setTab,
    openDispute,
  } = useDisputes();

  return (
    <>
      <div className="min-w-0 space-y-0">
        {/* ============================================================
            TABS
            ============================================================ */}

        <div className="border-b border-[#e7e9ee]">
          <div className="flex items-center gap-1">
            {(
              [
                ["open", "Open", openCount, openHasMore, openLoading],
                [
                  "resolved",
                  "Resolved",
                  resolvedCount,
                  resolvedHasMore,
                  resolvedLoading,
                ],
                [
                  "rejected",
                  "Rejected",
                  rejectedCount,
                  rejectedHasMore,
                  rejectedLoading,
                ],
              ] as const
            ).map(([tab, label, count, hasMore, countLoading]) => {
              const active =
                state.tab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setTab(tab)
                  }
                  className={[
                    "relative shrink-0 cursor-pointer px-4 py-3",
                    "text-[13px] font-semibold transition-colors",
                    active
                      ? "text-[#172033]"
                      : "text-[#687182] hover:text-[#172033]",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-1">
                    {label} ·{" "}
                    {countLoading ? (
                      <Skeleton width={18} height={12} radius={4} />
                    ) : (
                      `${count}${hasMore ? "+" : ""}`
                    )}
                  </span>

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#315c9f]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            CONTENT
            ============================================================ */}

        <div className="grid min-w-0 grid-cols-1 gap-4 pt-4 md:grid-cols-[minmax(0,1fr)_305px]">
          {/* ==========================================================
              DISPUTES
              ========================================================== */}

          <div className="min-w-0">
            {disputeError ? (
              <ErrorState
                error={disputeError}
                fallback="Could not load disputes."
                onRetry={retryDisputes}
                className="mb-3"
              />
            ) : null}
            {state.tab === "open" && (
              <OpenDisputesTab
                disputes={openDisputes}
                onOpen={openDispute}
                isLoading={openLoading}
                pagination={openPagination}
              />
            )}

            {state.tab === "resolved" && (
              <ClosedDisputesTab
                disputes={resolvedDisputes}
                onOpen={openDispute}
                isLoading={resolvedLoading}
                pagination={resolvedPagination}
                emptyTitle="No resolved disputes"
              />
            )}

            {state.tab === "rejected" && (
              <ClosedDisputesTab
                disputes={rejectedDisputes}
                onOpen={openDispute}
                isLoading={rejectedLoading}
                pagination={rejectedPagination}
                emptyTitle="No rejected disputes"
              />
            )}
          </div>

          {/* ==========================================================
              AUDIT TRAIL
              ========================================================== */}

          <AuditTrail
            items={auditItems}
            isLoading={auditLoading}
            isLoadingMore={auditLoadingMore}
            hasMore={auditHasMore}
            onLoadMore={loadMoreAudit}
            error={auditError}
            onRetry={retryAudit}
          />
        </div>
      </div>

      {/* ==============================================================
          DRAWER
          ============================================================== */}

      <DisputeDrawer />
    </>
  );
}

export const AdminDisputesPage =
  DisputesPage;