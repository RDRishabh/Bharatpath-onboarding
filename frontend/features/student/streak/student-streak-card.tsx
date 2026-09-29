"use client";

import Link from "next/link";
import {
  ChevronRight,
  Flame,
  RefreshCw,
  Trophy,
} from "lucide-react";

import { Skeleton } from "@/components/common/loading";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { useGetStudentStreakQuery } from "@/store/student";

import {
  daysToNextMilestone,
  milestoneProgress,
  statusClasses,
  statusLabel,
} from "./streak-utils";

export function StudentStreakCard() {
  const streak = useGetStudentStreakQuery();

  if (streak.isLoading) {
    return <StudentStreakCardSkeleton />;
  }

  if (streak.error || !streak.data) {
    return (
      <div className="flex min-h-44 flex-col justify-between gap-5 rounded-[24px] border border-[#E7E0D4] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[#5F6B80]">
          <Flame size={16} className="text-[#F97316]" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
            Daily streak
          </span>
        </div>
        <div>
          <p className="text-[16px] font-bold text-[#0A1931]">
            Streak unavailable
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#5F6B80]">
            {getApiErrorMessage(
              streak.error,
              "We could not load your daily streak.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void streak.refetch()}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DDD6C7] px-4 py-2 text-[13px] font-semibold text-[#0A1931] transition-colors hover:bg-[#F7F4EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F4DB2]/30"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const data = streak.data;
  const dayLabel = data.currentStreak === 1 ? "day" : "days";
  const progress = milestoneProgress(data);
  const daysToGo = daysToNextMilestone(data);
  const hasMilestones = data.milestones.length > 0;

  return (
    <Link
      href="/student/streak"
      aria-label="Open daily streak details"
      className="group grid overflow-hidden rounded-[24px] border border-[#E7E0D4] bg-white shadow-[0_5px_18px_rgba(10,25,49,0.06)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D8C7B0] hover:shadow-[0_12px_30px_rgba(10,25,49,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F4DB2]/30 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]"
    >
      <span className="flex flex-col gap-5 p-5 sm:p-6">
        <span className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[#5F6B80]">
            <Flame size={16} className="text-[#F97316]" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Daily streak
            </span>
          </span>
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
              statusClasses(data.status),
            ].join(" ")}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {statusLabel(data.status)}
          </span>
        </span>

        <span className="grid grid-cols-[auto_1fr] items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-[#F3D6B4] bg-[#FFF5E8] text-[#F97316] sm:h-[72px] sm:w-[72px]">
            <Flame
              size={36}
              fill="currentColor"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[34px] font-extrabold leading-none tracking-[-0.04em] text-[#0A1931] sm:text-[42px]">
              {data.currentStreak}
              <span className="ml-2 text-[17px] font-semibold tracking-normal text-[#3A4761] sm:text-[19px]">
                {dayLabel} streak
              </span>
            </span>
            <span className="mt-2 block text-[12px] text-[#5F6B80]">
              Personal best: {data.longestStreak}{" "}
              {data.longestStreak === 1 ? "day" : "days"}
            </span>
          </span>
          <span className="col-span-2 flex items-end justify-between border-t border-[#F0EBDF] pt-4 sm:col-span-1 sm:block sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
            <span className="block text-[26px] font-bold leading-none text-[#0A1931]">
              {data.pointsBalance}
              <span className="ml-1 text-[14px] font-semibold text-[#3A4761]">
                pts
              </span>
            </span>
            <span className="mt-1 block text-[11px] text-[#5F6B80]">
              Engagement balance
            </span>
          </span>
        </span>
      </span>

      <span className="flex flex-col justify-center gap-3 border-t border-[#F0EBDF] bg-[#FFFCF7] p-5 sm:p-6 lg:border-l lg:border-t-0">
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0A1931]">
            <Trophy size={15} className="text-[#B9891A]" aria-hidden="true" />
            {data.nextMilestone
              ? `Next: ${data.nextMilestone.days}d (+${data.nextMilestone.points} pts)`
              : hasMilestones
                ? "All milestones reached"
                : "No milestones configured"}
          </span>
          <span className="text-[#5F6B80] transition-transform group-hover:translate-x-0.5">
            <ChevronRight size={17} aria-hidden="true" />
          </span>
        </span>
        <span className="block h-2 overflow-hidden rounded-full bg-[#EEE9DD]">
          <span
            className="block h-full rounded-full bg-[#B9891A] transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </span>
        <span className="flex justify-between text-[11px] text-[#5F6B80]">
          <span>
            {data.nextMilestone
              ? `${daysToGo} ${daysToGo === 1 ? "day" : "days"} to go`
              : hasMilestones
                ? "Milestone ladder complete"
                : "Your daily streak still continues"}
          </span>
          <span>{progress}%</span>
        </span>
      </span>
    </Link>
  );
}

function StudentStreakCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid min-h-48 overflow-hidden rounded-[24px] border border-[#E7E0D4] bg-white lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]"
    >
      <span className="sr-only">Loading daily streak</span>
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex justify-between gap-3">
          <Skeleton width={112} height={12} radius={6} />
          <Skeleton width={142} height={28} radius={999} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton width={72} height={72} circle />
          <div className="flex-1">
            <Skeleton width="55%" height={36} radius={8} />
            <Skeleton className="mt-2" width={118} height={11} radius={5} />
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-4 border-t border-[#F0EBDF] bg-[#FFFCF7] p-5 sm:p-6 lg:border-l lg:border-t-0">
        <Skeleton width="72%" height={15} radius={6} />
        <Skeleton width="100%" height={8} radius={999} />
        <Skeleton width="48%" height={11} radius={5} />
      </div>
    </div>
  );
}
