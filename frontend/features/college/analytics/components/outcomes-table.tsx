"use client";

import { ColumnDef, DataTable } from "@/components/ui";
import { LocationPlacement } from "../types";

const COLUMNS: ColumnDef<LocationPlacement>[] = [
  {
    accessorKey: "location",
    header: "Location",
    cell: (row) => (
      <span className="font-semibold text-[#151b2b]">{row.location}</span>
    ),
  },
  {
    accessorKey: "hires",
    header: "Hired via platform",
    cell: (row) => (
      <span className="font-semibold text-[#151b2b]">{row.hires}</span>
    ),
  },
];

export function PlacementsByLocationTable({
  placements,
}: Readonly<{ placements: LocationPlacement[] }>) {
  return (
    <DataTable
      columns={COLUMNS}
      data={placements}
      keyExtractor={(row) => row.location}
      pageSize={10}
      itemLabel=""
      emptyTitle="No placements yet"
      emptySubtitle="Platform-sourced hires will appear here as students are hired."
      header={
        <div className="flex items-center justify-between gap-3 border-b border-[#e7e9ee] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#151b2b]">
            Hires by location
          </h2>
          <span className="text-[12px] font-medium text-[#777f90]">
            Sourced through BharatPath
          </span>
        </div>
      }
    />
  );
}
