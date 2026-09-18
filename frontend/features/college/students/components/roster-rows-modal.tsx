"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/ui/table";

import { useGetRosterImportRowsQuery } from "@/store/college/students/students.api";
import type { RosterRow, RosterRowState } from "@/store/college/types";

export interface RosterRowsModalProps {
  /** The import to inspect, or null when the modal is closed. */
  importId: string | null;
  fileName?: string;
  onClose: () => void;
}

const FILTERS: { label: string; value: RosterRowState | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Valid", value: "VALID" },
  { label: "Invalid", value: "INVALID" },
  { label: "Duplicate", value: "DUPLICATE" },
];

const ROW_STATE_STYLES: Record<RosterRowState, string> = {
  VALID: "bg-[#eaf5ef] text-[#23805d]",
  INVALID: "bg-[#fdf2f2] text-[#e02424]",
  DUPLICATE: "bg-[#fff5df] text-[#9a6b18]",
};

export function RosterRowsModal({
  importId,
  fileName,
  onClose,
}: RosterRowsModalProps) {
  const [filter, setFilter] = useState<RosterRowState | "ALL">("ALL");

  const isOpen = importId !== null;

  const { data, isLoading, isFetching } = useGetRosterImportRowsQuery(
    importId
      ? {
          importId,
          rowState: filter === "ALL" ? undefined : filter,
        }
      : null,
    { skip: !isOpen },
  );

  const columns: ColumnDef<RosterRow>[] = [
    {
      id: "row",
      header: "#",
      cellClassName: "whitespace-nowrap text-[#777f90]",
      cell: (row) => row.rowNumber,
    },
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <span className="text-[13px] font-medium text-[#151b2b]">
          {row.fullName ?? "—"}
        </span>
      ),
    },
    {
      id: "contact",
      header: "Phone / email",
      cell: (row) => (
        <span className="text-[12px] text-[#5d6673]">
          {row.phone ?? row.email ?? "—"}
        </span>
      ),
    },
    {
      id: "ref",
      header: "Student ref",
      cellClassName: "whitespace-nowrap",
      cell: (row) => (
        <span className="text-[12px] text-[#777f90]">
          {row.studentRef ?? "—"}
        </span>
      ),
    },
    {
      id: "state",
      header: "State",
      cellClassName: "whitespace-nowrap",
      cell: (row) => (
        <span className="inline-flex flex-col gap-0.5">
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROW_STATE_STYLES[row.rowState]}`}
          >
            {row.rowState.charAt(0) + row.rowState.slice(1).toLowerCase()}
          </span>
          {row.issues.length > 0 && (
            <span className="text-[10px] text-[#9a6b18]">
              {row.issues.join(", ")}
            </span>
          )}
        </span>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-[#e7e9ee] overflow-hidden"
        style={{ fontFamily: "'General Sans', sans-serif" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e9ee]">
          <div>
            <h3 className="text-[16px] font-bold text-[#151b2b]">
              Roster preview
            </h3>
            <p className="text-[12px] text-[#777f90]">
              {fileName ?? "Review rows before committing"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#777f90] hover:bg-[#f3f4f7] hover:text-[#151b2b] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  filter === option.value
                    ? "bg-[#151b2b] text-white"
                    : "bg-[#f3f4f7] text-[#5d6673] hover:bg-[#e9ebf0]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            <DataTable
              columns={columns}
              data={data ?? []}
              totalCount={(data ?? []).length}
              pageSize={25}
              keyExtractor={(row) => String(row.rowNumber)}
              itemLabel="rows"
              isLoading={isLoading || isFetching}
              emptyTitle="No rows"
              emptySubtitle="No rows match this filter."
              className="overflow-hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
