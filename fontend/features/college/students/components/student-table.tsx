"use client";

import React, { useMemo, useState } from "react";
import { Mail, Trash2 } from "lucide-react";

import {
  DataTable,
  type ColumnDef,
} from "@/components/ui/table";

import { Avatar } from "@/components/ui/avatar";
import { LinkStateBadge } from "@/components/ui/link-state-badge";
import { ScoreBandBadge } from "@/components/ui/score-band-badge";

import { CollegeStudent } from "../types";

export interface StudentTableProps {
  students: CollegeStudent[];
  totalCount?: number;
  pageSize?: number;
  onResend?: (student: CollegeStudent) => void;
  onRemove?: (student: CollegeStudent) => void;
}

export function StudentTable({
  students,
  totalCount,
  pageSize = 5,
  onResend,
  onRemove,
}: StudentTableProps) {
  /*
   * Keep a local page here because the DataTable component supports
   * client-side pagination when onPageChange is not provided.
   *
   * The DataTable itself also maintains its own local page, so this
   * state is intentionally not passed to DataTable. It is only kept
   * here if you later want to control pagination externally.
   */

  const columns = useMemo<ColumnDef<CollegeStudent>[]>(
    () => [
      /* =========================================================
         STUDENT
      ========================================================= */
      {
        id: "student",
        header: "Student",
        headerClassName: "whitespace-nowrap",
        cellClassName: "min-w-[240px]",
        cell: (student) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={student.name}
              size="sm"
            />

            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-[17px] text-[#151b2b]">
                {student.name}
              </div>

              <div className="truncate text-[11px] leading-[15px] text-[#777f90]">
                {student.email}
              </div>
            </div>
          </div>
        ),
      },

      /* =========================================================
         LINK STATE
      ========================================================= */
      {
        id: "link-state",
        header: "Link State",
        headerClassName: "whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        cell: (student) => (
          <LinkStateBadge state={student.status} />
        ),
      },

      /* =========================================================
         COURSE / YEAR
      ========================================================= */
      {
        id: "course",
        header: "Course / Year",
        headerClassName: "whitespace-nowrap",
        cellClassName: "min-w-[180px]",
        cell: (student) => (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-[17px] text-[#151b2b]">
              {student.course}
            </div>

            <div className="truncate text-[11px] leading-[15px] text-[#777f90]">
              {student.year}
            </div>
          </div>
        ),
      },

      /* =========================================================
         SCORE BAND
      ========================================================= */
      {
        id: "score-band",
        header: "Score Band",
        headerClassName: "whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        cell: (student) => (
          <ScoreBandBadge band={student.scoreBand} />
        ),
      },

      /* =========================================================
         ACTIVE
      ========================================================= */
      {
        id: "active",
        header: "Active",
        headerClassName: "whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        cell: (student) => (
          <span className="text-[12px] text-[#777f90]">
            {student.lastActive || "—"}
          </span>
        ),
      },

      /* =========================================================
         ACTIONS
      ========================================================= */
      {
        id: "actions",
        header: "Actions",
        headerClassName: "whitespace-nowrap text-right",
        cellClassName: "whitespace-nowrap text-right",
        cell: (student) => (
          <div className="flex items-center justify-end gap-1.5">
            {/* RESEND INVITE */}
            <button
              type="button"
              aria-label={`Resend invite to ${student.name}`}
              title="Resend invite"
              onClick={() => onResend?.(student)}
              className="
                grid
                h-8
                w-8
                shrink-0
                place-items-center
                rounded-[8px]
                border
                border-[#e2e5eb]
                bg-white
                text-[#6c7482]
                transition-colors
                hover:bg-[#f8f9fb]
                hover:text-[#151b2b]
              "
            >
              <Mail
                size={14}
                strokeWidth={2}
              />
            </button>

            {/* REMOVE STUDENT */}
            <button
              type="button"
              aria-label={`Remove ${student.name}`}
              title="Remove student"
              onClick={() => onRemove?.(student)}
              className="
                grid
                h-8
                w-8
                shrink-0
                place-items-center
                rounded-[8px]
                border
                border-[#e2e5eb]
                bg-white
                text-[#6c7482]
                transition-colors
                hover:bg-[#fff5f5]
                hover:text-[#c23b3b]
              "
            >
              <Trash2
                size={14}
                strokeWidth={2}
              />
            </button>
          </div>
        ),
      },
    ],
    [onResend, onRemove],
  );

  return (
    <DataTable
      columns={columns}
      data={students}
      totalCount={totalCount ?? students.length}
      pageSize={pageSize}
      keyExtractor={(student) => student.id}
      itemLabel="students"
      emptyTitle="No students found"
      emptySubtitle="There are no students matching your current filters."
      className="overflow-hidden"
    />
  );
}
