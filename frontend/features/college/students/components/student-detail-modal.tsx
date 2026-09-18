"use client";

import React from "react";
import {
  X,
  Briefcase,
  Mic,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { ScoreBandBadge } from "@/components/ui/score-band-badge";
import { Skeleton } from "@/components/common/loading";

import { useGetCollegeStudentQuery } from "@/store/college/students/students.api";

import { mapScoreBand } from "../hooks/use-students";

export interface StudentDetailModalProps {
  /** The candidate to open, or null when the modal is closed. */
  candidateId: string | null;
  onClose: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/*
 * Opening a single student is the only place a college sees a score, band and
 * activity — and every open is audited server-side (SRS §6). The list view is
 * deliberately name-only so that rendering the roster does not audit everyone.
 */
export function StudentDetailModal({
  candidateId,
  onClose,
}: StudentDetailModalProps) {
  const isOpen = candidateId !== null;

  const { data, isLoading, isError } = useGetCollegeStudentQuery(
    candidateId ?? "",
    { skip: !isOpen },
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-[#e7e9ee] overflow-hidden"
        style={{ fontFamily: "'General Sans', sans-serif" }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e9ee]">
          <div>
            <h3 className="text-[16px] font-bold text-[#151b2b]">
              {data?.fullName ?? "Student"}
            </h3>
            <p className="text-[12px] text-[#777f90]">
              Individually visible since{" "}
              {formatDate(data?.visibleSince ?? null)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close student"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#777f90] hover:bg-[#f3f4f7] hover:text-[#151b2b] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#fdf2f2] text-[#e02424] mb-3">
                <AlertCircle size={20} strokeWidth={2.2} />
              </div>
              <p className="text-[14px] font-semibold text-[#151b2b]">
                This student is no longer visible
              </p>
              <p className="mt-1 text-[13px] text-[#777f90] max-w-xs">
                They may have withdrawn individual visibility. Consent is
                checked live on every open.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* SCORE */}
              <div className="flex items-center justify-between rounded-xl border border-[#e7e9ee] bg-[#f8f9fb] px-5 py-4">
                <div>
                  <p className="text-[12px] font-semibold text-[#777f90]">
                    BharatPath score
                  </p>
                  {data.score !== null ? (
                    <p className="mt-0.5 text-[26px] font-bold leading-none text-[#151b2b]">
                      {data.score}
                    </p>
                  ) : (
                    <p className="mt-1 text-[14px] font-semibold text-[#777f90]">
                      Not scored yet
                    </p>
                  )}
                  {data.scoredAt && (
                    <p className="mt-1 text-[11px] text-[#8a91a0]">
                      Scored {formatDate(data.scoredAt)}
                    </p>
                  )}
                </div>
                <ScoreBandBadge band={mapScoreBand(data.band)} />
              </div>

              {/* ACTIVITY COUNTS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#e7e9ee] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#5b4fcf]">
                    <Briefcase size={15} strokeWidth={2.2} />
                    <span className="text-[12px] font-semibold text-[#777f90]">
                      Applications
                    </span>
                  </div>
                  <p className="mt-1 text-[20px] font-bold text-[#151b2b]">
                    {data.applications}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e7e9ee] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#5b4fcf]">
                    <Mic size={15} strokeWidth={2.2} />
                    <span className="text-[12px] font-semibold text-[#777f90]">
                      Interviews
                    </span>
                  </div>
                  <p className="mt-1 text-[20px] font-bold text-[#151b2b]">
                    {data.interviews}
                  </p>
                </div>
              </div>

              {/* HIRES */}
              <div>
                <p className="text-[13px] font-bold text-[#151b2b] mb-2">
                  Hires on BharatPath
                </p>
                {data.hires.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#dfe2e8] bg-[#fcfdfe] px-4 py-4 text-[13px] text-[#777f90]">
                    No platform hires recorded yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.hires.map((hire, index) => (
                      <li
                        key={`${hire.jobTitle}-${index}`}
                        className="flex items-start gap-3 rounded-xl border border-[#e7e9ee] px-4 py-3"
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eaf5ef] text-[#23805d]">
                          <CheckCircle2 size={16} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#151b2b]">
                            {hire.jobTitle}
                          </p>
                          <p className="text-[12px] text-[#777f90]">
                            {hire.employerName} • {formatDate(hire.hiredAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
