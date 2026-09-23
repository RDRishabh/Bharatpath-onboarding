"use client";

import { useCallback, useDeferredValue } from "react";
import { Check, Search } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectJobQualifiedOnly,
  selectJobSearch,
  selectJobWorkMode,
  setJobSearch,
  setJobWorkMode,
  toggleQualifiedOnly,
  useLazyGetStudentJobsQuery,
} from "@/store/student";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { useCursorLoadMore } from "@/lib/pagination/use-cursor-load-more";
import { EmptyState, JobCard } from "@/features/student/components";
import { StudentPage } from "@/features/student/shell";

const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;

export function JobFeed() {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectJobSearch);
  const deferredSearch = useDeferredValue(search);
  const qualifiedOnly = useAppSelector(selectJobQualifiedOnly);
  const workMode = useAppSelector(selectJobWorkMode);
  const [fetchJobs] = useLazyGetStudentJobsQuery();

  const jobs = useCursorLoadMore(
    useCallback(
      (cursor: string | undefined) =>
        fetchJobs({
          q: deferredSearch.trim() || undefined,
          workMode: workMode ?? undefined,
          eligibleOnly: qualifiedOnly,
          cursor,
          limit: 20,
        }).unwrap(),
      [fetchJobs, deferredSearch, workMode, qualifiedOnly],
    ),
    [deferredSearch, workMode, qualifiedOnly],
  );

  return (
    <StudentPage>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <span className="text-[24px] font-bold leading-7 tracking-[-0.025em] text-[#0A1931] sm:text-[28px]">
            Jobs
          </span>
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
          <div className="bp-scrollbar flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={qualifiedOnly}
              onClick={() => dispatch(toggleQualifiedOnly())}
            >
              {qualifiedOnly ? <Check size={11} /> : null}
              I qualify
            </FilterButton>
            {WORK_MODES.map((mode) => (
              <FilterButton
                key={mode}
                active={workMode === mode}
                onClick={() => dispatch(setJobWorkMode(mode))}
              >
                {mode[0] + mode.slice(1).toLowerCase()}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
            {jobs.items.length} jobs
          </span>
        </div>

        {jobs.isLoading ? (
          <div className="rounded-2xl border border-[#E7E0D4] bg-white p-5 text-sm text-[#5F6B80]">
            Loading jobs…
          </div>
        ) : jobs.error ? (
          <EmptyState
            icon={<Search size={22} />}
            title="Jobs unavailable"
            message={getApiErrorMessage(jobs.error, "Could not load jobs.")}
          />
        ) : jobs.items.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {jobs.hasMore ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={jobs.loadMore}
                  disabled={jobs.isLoadingMore}
                  className="rounded-full border border-[#E7E0D4] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0A1931] transition-colors hover:bg-[#F7F3EC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {jobs.isLoadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={<Search size={22} />}
            title="No jobs match"
            message="Try clearing a filter or changing your search."
          />
        )}
      </div>
    </StudentPage>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "border border-[#C9BEEB] bg-[#F1EAF7] text-[#4A3E8F]"
          : "border border-[#E7E0D4] bg-white text-[#0A1931]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
