"use client";

import { useRouter } from "next/navigation";

import type { JobApplication } from "@/features/student/types";

import { MonogramTile, StatusChip, type ChipTone } from "./primitives";

/*
 * ==========================================================================
 * APPLICATION CARD
 *
 * Identity row one size down, then a 5-segment indigo stage strip captioned
 * STAGE X OF 5 + a human label. Segments alone are never information.
 * ==========================================================================
 */

const STATUS_TONE: Record<string, ChipTone> = {
  SUBMITTED: "waiting",
  VIEWED: "waiting",
  SHORTLISTED: "advanced",
  INTERVIEW: "advanced",
  OFFER: "advanced",
  REJECTED: "short",
  WITHDRAWN: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Sent",
  VIEWED: "Viewed",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Closed",
  WITHDRAWN: "Withdrawn",
};

export function ApplicationCard({ application }: { application: JobApplication }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/student/board/${application.id}`)}
      className="flex w-full cursor-pointer flex-col gap-3 rounded-[20px] border border-[#E7E0D4] bg-white p-4 text-left transition-transform active:scale-[.99]"
    >
      <div className="flex items-center gap-3">
        <MonogramTile tint="indigo" size={40}>
          {application.monogram}
        </MonogramTile>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[15px] font-bold leading-5 tracking-[-0.02em] text-[#0A1931]">
            {application.title}
          </span>
          <span className="truncate text-[12px] leading-4 text-[#5F6B80]">
            {application.company} · applied {application.appliedOn}
          </span>
        </div>

        <StatusChip tone={STATUS_TONE[application.status]}>
          {STATUS_LABEL[application.status]}
        </StatusChip>
      </div>

      {/* Stage strip */}
      <div className="flex flex-col gap-2">
        <span className="flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  index < application.stageIndex ? "#5E4DB2" : "#F0EBDF",
              }}
            />
          ))}
        </span>
        <span className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase leading-3 tracking-[0.06em] text-[#5F6B80]">
            Stage {application.stageIndex} of 5
          </span>
          <span className="text-[11px] font-medium leading-3 text-[#3A4761]">
            {application.stageLabel}
          </span>
        </span>
      </div>
    </button>
  );
}
