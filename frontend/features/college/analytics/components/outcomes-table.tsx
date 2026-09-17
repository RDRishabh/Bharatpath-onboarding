"use client";

import { ColumnDef, DataTable, StatusBadge, StatusBadgeTone } from "@/components/ui";
import { Outcome, OutcomeStage } from "../types";

const STAGE_TONE: Record<OutcomeStage, StatusBadgeTone> = {
  Hired: "success",
  Interview: "info",
  Shortlisted: "neutral",
  Applied: "muted",
};

const COLUMNS: ColumnDef<Outcome>[] = [
  {
    accessorKey: "role",
    header: "Role",
    cell: (row) => (
      <span className="font-semibold text-[#151b2b]">{row.role}</span>
    ),
  },
  {
    accessorKey: "employer",
    header: "Employer",
    cellClassName: "text-[#4f5666]",
  },
  {
    accessorKey: "applied",
    header: "Applied",
    cellClassName: "text-[#8a91a0]",
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: (row) => (
      <StatusBadge label={row.stage} tone={STAGE_TONE[row.stage]} />
    ),
  },
  {
    accessorKey: "students",
    header: "Students",
    cell: (row) => (
      <span className="font-semibold text-[#151b2b]">{row.students}</span>
    ),
  },
];

export function OutcomesTable({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      data={outcomes}
      keyExtractor={(row) => row.id}
      pageSize={4}
      itemLabel=""
      emptyTitle="No outcomes yet"
      emptySubtitle="Platform-sourced roles will appear here as students apply."
      header={
        <div className="flex items-center justify-between gap-3 border-b border-[#e7e9ee] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#151b2b]">
            Outcomes sourced through BharatPath
          </h2>
          <span className="text-[12px] font-medium text-[#777f90]">
            Updated daily
          </span>
        </div>
      }
    />
  );
}
