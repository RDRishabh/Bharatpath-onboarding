"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { ListChecks } from "lucide-react";

import { useLazyGetStudentApplicationsQuery } from "@/store/student";
import { ApplicationCard, EmptyState, StudentErrorState } from "@/features/student/components";
import { Spinner } from "@/components/common/loading";
import { StudentPage } from "@/features/student/shell";
import { useCursorLoadMore } from "@/lib/pagination/use-cursor-load-more";

const APPLICATIONS_PAGE_SIZE = 20;

export function ApplicationBoard() {
  const [fetchApplications] = useLazyGetStudentApplicationsQuery();
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const applications = useCursorLoadMore(
    useCallback(
      (cursor: string | undefined) =>
        fetchApplications({
          cursor,
          limit: APPLICATIONS_PAGE_SIZE,
        }).unwrap(),
      [fetchApplications],
    ),
  );
  const loadMoreFromObserver = useEffectEvent(applications.loadMore);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (
      !sentinel ||
      !applications.hasMore ||
      applications.isLoading ||
      applications.isLoadingMore ||
      applications.error
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreFromObserver();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    applications.error,
    applications.hasMore,
    applications.isLoading,
    applications.isLoadingMore,
  ]);

  return (
    <StudentPage
      className={
        applications.isLoading ? "flex min-h-[calc(100dvh-5rem)] flex-col" : ""
      }
    >
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <div className="bp-scrollbar flex gap-2 overflow-x-auto pb-1">
            <span className="whitespace-nowrap rounded-full border border-[#C9BEEB] bg-[#F1EAF7] px-3.5 py-2 text-[13px] font-semibold text-[#4A3E8F]">
              All
            </span>
          </div>
        </div>

        {!applications.isLoading && (
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
              {applications.items.length} applications
            </span>
          </div>
        )}

        {applications.isLoading ? (
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 text-center">
            <Spinner size={32} tone="primary" />
            <p className="text-[15px] font-semibold text-[#0A1931]">
              Loading your board
            </p>
            <p className="text-[13px] text-[#5F6B80]">
              Checking the latest status of your applications.
            </p>
          </div>
        ) : applications.error && !applications.items.length ? (
          <StudentErrorState
            icon={<ListChecks size={22} />}
            title="Applications unavailable"
            error={applications.error}
            fallback="Could not load applications."
          />
        ) : applications.items.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {applications.items.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                />
              ))}
            </div>

            {applications.isLoadingMore ? (
              <div className="flex justify-center py-6">
                <Spinner
                  size={28}
                  tone="primary"
                  label="Loading more applications"
                />
              </div>
            ) : null}

            {applications.error && applications.hasMore ? (
              <div className="flex flex-col items-center gap-2 pt-1">
                <span className="text-[13px] text-[#5F6B80]">
                  Could not load more applications.
                </span>
                <button
                  type="button"
                  onClick={applications.loadMore}
                  className="rounded-full border border-[#E7E0D4] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0A1931] transition-colors hover:bg-[#F7F3EC]"
                >
                  Try again
                </button>
              </div>
            ) : null}

            <div
              ref={loadMoreSentinelRef}
              aria-hidden="true"
              className="h-px w-full"
            />
          </>
        ) : (
          <EmptyState
            icon={<ListChecks size={22} />}
            title="Nothing here yet"
            message="Apply to a job and its live status will appear here."
          />
        )}
      </div>
    </StudentPage>
  );
}
