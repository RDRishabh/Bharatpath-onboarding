"use client";

import { usePageHeader } from "@/components/layout/header-context";

import { useDisputes } from "../hooks/use-disputes";

import { AuditTrail } from "./audit-trail";
import { DisputeDrawer } from "./dispute-drawer";
import { OpenDisputesTab } from "./open-disputes-tab";
import { ResolvedDisputesTab } from "./resolved-disputes-tab";

export function DisputesPage() {
  usePageHeader(
    "Disputes & Audit",
    "Investigate disputes and trace every operator action",
  );

  const {
    state,
    openDisputes,
    resolvedDisputes,
    auditItems,
    openCount,
    resolvedCount,
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
                [
                  "open",
                  `Open · ${openCount}`,
                ],
                [
                  "resolved",
                  `Resolved · ${resolvedCount}`,
                ],
              ] as const
            ).map(([tab, label]) => {
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
                  {label}

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
            {state.tab === "open" && (
              <OpenDisputesTab
                disputes={openDisputes}
                onOpen={openDispute}
              />
            )}

            {state.tab === "resolved" && (
              <ResolvedDisputesTab
                disputes={resolvedDisputes}
                onOpen={openDispute}
              />
            )}
          </div>

          {/* ==========================================================
              AUDIT TRAIL
              ========================================================== */}

          <AuditTrail
            items={auditItems}
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