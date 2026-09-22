"use client";

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSavedJob, selectIsJobSaved } from "@/store/student";
import type { JobListing } from "@/features/student/types";

import { MonogramTile, StatusChip } from "./primitives";

/*
 * ==========================================================================
 * JOB CARD
 *
 * Identity row (monogram · role · verified company) → data row (mono money ·
 * dot-separated meta) → footer meta behind a hairline. A MATCH / N SHORT chip
 * states the bar; the save heart is a local Redux toggle.
 * ==========================================================================
 */

export function JobCard({ job }: { job: JobListing }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const saved = useAppSelector(selectIsJobSaved(job.id));

  const open = () => router.push(`/student/jobs/${job.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] border border-[#E7E0D4] bg-white p-4 text-left transition-transform active:scale-[.99]"
    >
      {/* Identity row */}
      <div className="flex items-center gap-3">
        <MonogramTile tint={job.monogramTint}>{job.monogram}</MonogramTile>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[16px] font-bold leading-5 tracking-[-0.02em] text-[#0A1931]">
            {job.title}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] leading-4 text-[#5F6B80]">
            <span className="truncate">{job.company}</span>
            {job.companyVerified ? (
              <BadgeCheck size={14} className="shrink-0 text-[#1F6B45]" />
            ) : null}
          </span>
        </div>

        <button
          type="button"
          aria-label={saved ? "Remove saved job" : "Save job"}
          aria-pressed={saved}
          onClick={(event) => {
            event.stopPropagation();
            dispatch(toggleSavedJob(job.id));
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#5F6B80] transition-colors hover:bg-[#F7F4EC]"
        >
          <Bookmark
            size={17}
            className={saved ? "text-[#5F4DB2]" : ""}
            fill={saved ? "#5F4DB2" : "none"}
          />
        </button>
      </div>

      {/* Data row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[14px] font-bold leading-[18px] text-[#0A1931]">
          {job.salaryLabel}
        </span>
        <Dot />
        <span className="text-[13px] leading-[18px] text-[#5F6B80]">
          {job.location}
          {job.distanceKm != null ? ` · ${job.distanceKm} km` : ""}
        </span>
        <Dot />
        <span className="text-[13px] leading-[18px] text-[#5F6B80]">
          Needs {job.requiredScore}
        </span>
      </div>

      {/* Footer meta + status */}
      <div className="flex items-center gap-2 border-t border-[#F0EBDF] pt-3">
        <Clock size={14} className="text-[#5F6B80]" />
        <span className="flex-1 text-[12px] leading-4 text-[#5F6B80]">
          Posted {job.postedAgo} · {job.applicantCount} applied
        </span>

        {job.match === "match" ? (
          <StatusChip tone="match" icon={<CheckCircle2 size={12} />}>
            Match
          </StatusChip>
        ) : (
          <StatusChip tone="short">{job.pointsShort} short</StatusChip>
        )}

        <ChevronRight size={13} className="text-[#6E7889]" />
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-[#B5AC96]" />;
}
