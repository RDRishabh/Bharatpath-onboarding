"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setBoardFilter,
  selectApplications,
  selectBoardFilter,
  type BoardFilter,
} from "@/store/student";
import {
  ApplicationCard,
  EmptyState,
} from "@/features/student/components";
import { StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * APPLICATION BOARD — the Board hub. Filter tabs narrow the live application
 * list held in Redux (applying to a job from the feed adds a row here).
 * ==========================================================================
 */

const FILTERS: { key: BoardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "interview", label: "Interview" },
  { key: "closed", label: "Closed" },
];

const ACTIVE = new Set(["SUBMITTED", "VIEWED", "SHORTLISTED"]);
const INTERVIEWING = new Set(["INTERVIEW", "OFFER"]);
const CLOSED = new Set(["REJECTED", "WITHDRAWN"]);

export function ApplicationBoard() {
  const dispatch = useAppDispatch();
  const applications = useAppSelector(selectApplications);
  const filter = useAppSelector(selectBoardFilter);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (filter === "active") return ACTIVE.has(app.status);
      if (filter === "interview") return INTERVIEWING.has(app.status);
      if (filter === "closed") return CLOSED.has(app.status);
      return true;
    });
  }, [applications, filter]);

  return (
    <StudentPage>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-[24px] font-bold leading-7 tracking-[-0.025em] text-[#0A1931] sm:text-[28px]">
            Your board
          </span>

          <div className="bp-scrollbar flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => dispatch(setBoardFilter(tab.key))}
                  className={[
                    "whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "border border-[#C9BEEB] bg-[#F1EAF7] text-[#4A3E8F]"
                      : "border border-[#E7E0D4] bg-white text-[#0A1931]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ListChecks size={22} />}
            title="Nothing here yet"
            message="Apply to a job and it shows up on your board with a live status."
          />
        )}
      </div>
    </StudentPage>
  );
}
