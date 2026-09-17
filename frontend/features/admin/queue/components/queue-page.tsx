"use client";

import { Filter } from "lucide-react";

import { usePageHeader } from "@/components/layout/header-context";

import { DataTable } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";

import { RiskBadge } from "../../shared/status-badge";

import { QueueDrawer } from "./queue-drawer";

import { useQueue } from "../hooks/use-queue";

import type {
  QueueItem,
  QueueTab,
} from "../types";

export function QueuePage() {
  usePageHeader(
    "KYB & Integrity queue",
    "Review submissions and flagged accounts, then act",
  );

  const {
    tab,
    items,
    kybCount,
    integrityCount,
    openReview,
    setTab,
  } = useQueue();

  const isKyb = tab === "kyb";

  const columns: ColumnDef<QueueItem>[] = [
    {
      id: "subject",

      header: "Subject",

      headerClassName:
        "min-w-[310px]",

      cellClassName:
        "min-w-[310px]",

      cell: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef3fb] text-[10px] font-bold text-[#315c9f]">
            {item.initials}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-5 text-[#172033]">
              {item.name}
            </p>

            <p className="truncate text-[11px] leading-4 text-[#7b8494]">
              {item.submitted}
            </p>
          </div>
        </div>
      ),
    },

    {
      id: "secondary",

      header: isKyb
        ? "GSTIN"
        : "Flag",

      headerClassName:
        "min-w-[175px]",

      cellClassName:
        "min-w-[175px] whitespace-nowrap text-[12px] text-[#344054]",

      cell: (item) =>
        item.secondary,
    },

    {
      id: "risk",

      header: "Risk",

      headerClassName:
        "min-w-[118px]",

      cellClassName:
        "min-w-[118px]",

      cell: (item) => (
        <RiskBadge risk={item.risk} />
      ),
    },

    {
      id: "waiting",

      header: "Waiting",

      headerClassName:
        "min-w-[125px]",

      cellClassName:
        "min-w-[125px] whitespace-nowrap text-[13px] font-semibold text-[#172033]",

      cell: (item) =>
        item.waiting,
    },

    {
      id: "actions",

      header: "Actions",

      headerClassName:
        "min-w-[170px]",

      cellClassName:
        "min-w-[170px]",

      cell: (item) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openReview(item.id)
            }
            className="cursor-pointer rounded-lg border border-[#e2e5eb] bg-white px-3 py-2 text-[11px] font-semibold text-[#172033] transition-colors hover:bg-[#f8f9fb]"
          >
            Review
          </button>

          <button
            type="button"
            className="cursor-pointer rounded-lg bg-[#5b4fcf] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#4f44bc]"
          >
            Approve
          </button>
        </div>
      ),
    },
  ];

  const tabs: Array<
    [QueueTab, string]
  > = [
    [
      "kyb",
      `KYB · ${kybCount}`,
    ],
    [
      "integrity",
      `Integrity · ${integrityCount}`,
    ],
  ];

  return (
    <>
      <div className="min-w-0 space-y-0">
        {/* ================================================================ */}
        {/* Tabs                                                             */}
        {/* ================================================================ */}

        <div className="border-b border-[#e7e9ee]">
          <div className="flex items-center gap-1">
            {tabs.map(
              ([key, label]) => {
                const active =
                  tab === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setTab(key)
                    }
                    className={[
                      "relative cursor-pointer px-4 py-3 text-[13px] font-semibold transition-colors",
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
              },
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* Filters / Summary                                                */}
        {/* ================================================================ */}

        <div className="flex flex-wrap items-center gap-3 px-0 pt-4">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e5eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#172033] transition-colors hover:bg-[#f8f9fb]"
          >
            <Filter className="h-4 w-4" />

            Filters
          </button>

          <span className="text-[12px] text-[#7b8494]">
            {isKyb
              ? `${kybCount} submissions awaiting review`
              : `${integrityCount} flags awaiting action`}
          </span>
        </div>

        {/* ================================================================ */}
        {/* Queue Table                                                      */}
        {/* ================================================================ */}

        <div className="pt-4">
          <DataTable<QueueItem>
            columns={columns}
            data={items}
            keyExtractor={(item) =>
              item.id
            }
            pageSize={4}
            totalCount={items.length}
            itemLabel=""
            emptyTitle={
              isKyb
                ? "No KYB submissions found"
                : "No integrity flags found"
            }
            emptySubtitle=""
            className="w-full"
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* Review Drawer                                                     */}
      {/* ================================================================ */}

      <QueueDrawer />
    </>
  );
}

export const AdminQueuePage =
  QueuePage;