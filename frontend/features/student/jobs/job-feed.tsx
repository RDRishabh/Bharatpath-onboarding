"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Check } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setJobSearch,
  toggleQualifiedOnly,
  setJobCategory,
  selectJobSearch,
  selectJobQualifiedOnly,
  selectJobCategory,
} from "@/store/student";
import { jobListings, studentScore } from "@/features/student/data";
import { JobCard, EmptyState } from "@/features/student/components";
import { StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * JOB FEED — the Jobs hub. Search, "I qualify" and category pills all filter
 * the mock list locally; no network.
 * ==========================================================================
 */

const CATEGORIES = ["Lab & QC", "Operations", "Research"];

export function JobFeed() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const search = useAppSelector(selectJobSearch);
  const qualifiedOnly = useAppSelector(selectJobQualifiedOnly);
  const category = useAppSelector(selectJobCategory);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobListings.filter((job) => {
      if (qualifiedOnly && job.match !== "match") return false;
      if (category && job.category !== category) return false;
      if (query) {
        const haystack = [
          job.title,
          job.company,
          job.category,
          ...job.skills,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [search, qualifiedOnly, category]);

  const qualifyingCount = jobListings.filter(
    (job) => job.match === "match",
  ).length;

  return (
    <StudentPage>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-[24px] font-bold leading-7 tracking-[-0.025em] text-[#0A1931] sm:text-[28px]">
            Jobs
          </span>

          {/* Score teaser */}
          <button
            type="button"
            onClick={() => router.push("/student/score")}
            className="flex items-center gap-3.5 overflow-hidden rounded-[20px] bg-[#5F4DB2] px-[18px] py-4 text-left transition-transform active:scale-[.99]"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase leading-3 tracking-[0.12em] text-[#E0DBF4]">
                Your score
              </span>
              <span className="text-[22px] font-extrabold leading-6 tracking-[-0.03em] text-white">
                {studentScore.value}
              </span>
            </span>
            <span className="h-9 w-px bg-white/15" />
            <span className="flex-1 text-[12px] leading-4 text-[#DCD6F4]">
              Open to your score of{" "}
              <span className="font-bold text-[#F4D685]">{studentScore.value}</span>.
              Nine more unlock at{" "}
              <span className="font-bold text-[#F4D685]">734</span>.
            </span>
            <ChevronRight size={15} className="text-white" />
          </button>

          {/* Search */}
          <label className="flex items-center gap-3 rounded-full border border-[#E7E0D4] bg-white px-4 py-3">
            <Search size={16} className="text-[#5F6B80]" />
            <input
              value={search}
              onChange={(event) => dispatch(setJobSearch(event.target.value))}
              placeholder="Role, company or skill"
              aria-label="Search jobs"
              className="flex-1 bg-transparent text-[15px] leading-5 text-[#0A1931] outline-none placeholder:text-[#8891a0]"
            />
          </label>

          {/* Filter pills */}
          <div className="bp-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => dispatch(toggleQualifiedOnly())}
              className={[
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                qualifiedOnly
                  ? "border border-[#C9BEEB] bg-[#F1EAF7] text-[#4A3E8F]"
                  : "border border-[#E7E0D4] bg-white text-[#0A1931]",
              ].join(" ")}
            >
              {qualifiedOnly ? (
                <span className="grid h-[13px] w-[13px] place-items-center rounded-full bg-[#4A3E8F]">
                  <Check size={9} className="text-[#F1EAF7]" />
                </span>
              ) : null}
              I qualify · {qualifyingCount}
            </button>

            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => dispatch(setJobCategory(cat))}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "border border-[#C9BEEB] bg-[#F1EAF7] text-[#4A3E8F]"
                      : "border border-[#E7E0D4] bg-white text-[#0A1931]",
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count */}
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
            {filtered.length} {filtered.length === 1 ? "job" : "jobs"}
          </span>
          <span className="text-[12px] font-semibold text-[#0A1931]">
            Nearest first
          </span>
        </div>

        {/* List */}
        {filtered.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={22} />}
            title="No jobs match"
            message="Try clearing a filter or turning off “I qualify” to see more roles."
          />
        )}
      </div>
    </StudentPage>
  );
}
