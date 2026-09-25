"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { usePageHeader } from "@/components/layout/header-context";
import { Skeleton } from "@/components/common/loading";
import { DataTable, type ColumnDef } from "@/components/ui/table";
import { ErrorState } from "@/components/ui";
import {
  tablePagination,
  useCursorPagination,
} from "@/lib/pagination/use-cursor-pagination";

import {
  useGetRosterImportQuery,
  useGetRosterImportRowsQuery,
} from "@/store/college/students/students.api";
import type {
  RosterImport,
  RosterRow,
  RosterRowState,
} from "@/store/college/types";

type RowFilter = RosterRowState | "ALL";

const FILTERS: { label: string; value: RowFilter }[] = [
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

function filterCount(
  import_: RosterImport | undefined,
  filter: RowFilter,
): number | null {
  if (!import_) return null;
  switch (filter) {
    case "VALID":
      return import_.validRows;
    case "INVALID":
      return import_.invalidRows;
    case "DUPLICATE":
      return import_.duplicateRows;
    default:
      return import_.totalRows;
  }
}

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

/*
 * One roster import's rows, on their own page. The import itself (file name
 * and counts) and its rows are separate requests; the rows are cursor-paged
 * and filtered by state on the server, exactly as the old preview dialog did.
 */
export function RosterImportRowsPage() {
  const { importId } = useParams<{ importId: string }>();
  const [filter, setFilter] = useState<RowFilter>("ALL");
  const pagination = useCursorPagination([importId, filter], 10);

  const importQuery = useGetRosterImportQuery(importId);
  const rowsQuery = useGetRosterImportRowsQuery({
    importId,
    rowState: filter === "ALL" ? undefined : filter,
    cursor: pagination.cursor,
    limit: pagination.pageSize,
  });

  const fileName = importQuery.data?.fileName;

  usePageHeader(
    "Roster preview",
    fileName ? `Rows in ${fileName}` : "Review rows before committing",
    {
      breadcrumbs: [
        { label: "Students", href: "/college/students" },
        { label: fileName ?? "Roster import" },
        { label: "Rows" },
      ],
    },
  );

  return (
    <div
      className="mx-auto flex max-w-[1280px] flex-col gap-4"
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/college/students"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#3566b8] transition-colors hover:bg-[#edf2fa]"
        >
          <ArrowLeft size={15} />
          Back to students
        </Link>

        {importQuery.isLoading ? (
          <Skeleton width={220} height={14} radius={6} />
        ) : importQuery.data ? (
          <span className="text-[12px] text-[#777f90]">
            {importQuery.data.state.charAt(0) +
              importQuery.data.state.slice(1).toLowerCase().replaceAll("_", " ")}{" "}
            · uploaded{" "}
            {new Date(importQuery.data.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : null}
      </div>

      {importQuery.error ? (
        <ErrorState
          error={importQuery.error}
          fallback="This roster import could not be loaded."
          onRetry={() => void importQuery.refetch()}
        />
      ) : null}

      <section className="rounded-2xl border border-[#e7e9ee] bg-white p-4 shadow-2xs sm:p-5">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((option) => {
            const count = filterCount(importQuery.data, option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  filter === option.value
                    ? "bg-[#151b2b] text-white"
                    : "bg-[#f3f4f7] text-[#5d6673] hover:bg-[#e9ebf0]"
                }`}
              >
                {option.label}
                {count !== null ? ` · ${count}` : ""}
              </button>
            );
          })}
        </div>

        {rowsQuery.error ? (
          <ErrorState
            error={rowsQuery.error}
            fallback="The rows could not be loaded."
            onRetry={() => void rowsQuery.refetch()}
            className="mb-3"
          />
        ) : null}

        <DataTable
          columns={columns}
          data={rowsQuery.currentData?.items ?? []}
          paginationMode="cursor"
          {...tablePagination(pagination, rowsQuery.currentData?.nextCursor)}
          keyExtractor={(row) => String(row.rowNumber)}
          itemLabel="rows"
          isLoading={rowsQuery.isLoading || rowsQuery.isFetching}
          emptyTitle="No rows"
          emptySubtitle="No rows match this filter."
          className="overflow-hidden"
        />
      </section>
    </div>
  );
}
