"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { Loader } from "@/components/common/loader";
import { usePageHeader } from "@/components/layout/header-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToNextCandidatePage,
  goToPreviousCandidatePage,
  selectEmployerCandidateCursor,
  selectEmployerCandidateFilters,
  selectEmployerCandidatePage,
  setCandidateSearch,
  toggleCandidateBand,
  toggleCandidateFilter,
  useSearchEmployerCandidatesQuery,
} from "@/store/employer/candidates";

import { CandidateCard } from "./candidate-card";
import { CandidateFilters } from "./candidate-filters";

const PAGE_SIZE = 4;

export function CandidatesPage() {
  usePageHeader(
    "Candidates",
    "Search the masked candidate pool by score, skills and location"
  );

  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectEmployerCandidateFilters);
  const page = useAppSelector(selectEmployerCandidatePage);
  const cursor = useAppSelector(selectEmployerCandidateCursor);
  const query = useMemo(() => ({
    q: filters.search.trim() || undefined,
    band: filters.bands.length ? filters.bands : undefined,
    skill: filters.skills.length ? filters.skills : undefined,
    badge: filters.addons.length ? filters.addons : undefined,
    city: filters.locations[0],
    min_experience_years: filters.experiences.length
      ? Math.min(...filters.experiences.map((value) => value === "6+" ? 6 : value === "3-5" ? 3 : 0))
      : undefined,
    cursor: cursor || undefined,
    limit: PAGE_SIZE,
  }), [cursor, filters]);

  const { data, error, isLoading, isFetching } = useSearchEmployerCandidatesQuery(query);
  const candidates = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  /* =====================================================
     PAGE
     ===================================================== */

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#f7f8fa] text-[#202a3b]">

      {/* =================================================
          MAIN CANDIDATES SECTION
          ================================================= */}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        {/* -------------------------------------------------
            TOOLBAR
            ------------------------------------------------- */}

        <div className="flex h-[54px] shrink-0 items-center justify-between px-4">

          <div className="text-[12px] text-[#647083]">
            {isLoading ? "Loading candidates..." : `Showing ${candidates.length} candidates`}
          </div>

          <span className="text-[11px] text-[#697385]">
            Ordered by match band
          </span>
        </div>

        {/* -------------------------------------------------
            CANDIDATE LIST

            THIS IS THE ONLY SCROLLABLE AREA
            ------------------------------------------------- */}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">

          <div className="flex h-full flex-col gap-3">

            {isLoading && (
              <div className="flex flex-1 items-center justify-center">
                <Loader label="Loading candidates…" />
              </div>
            )}

            {!isLoading && candidates.map((candidate) => (
              <CandidateCard
                key={candidate.candidateId}
                candidate={candidate}
              />
            ))}

            {error && (
              <div className="rounded-[12px] border border-[#f0caca] bg-[#fff7f7] p-10 text-center text-[12px] text-[#9b3d3d]">
                Candidates could not be loaded. Check your employer subscription and API connection.
              </div>
            )}

            {!isLoading && !error && candidates.length === 0 && (
              <div className="rounded-[12px] border border-dashed border-[#dfe3e9] bg-white p-10 text-center text-[12px] text-[#737d8c]">
                No candidates match the selected filters.
              </div>
            )}

          </div>
        </div>

        {/* -------------------------------------------------
            PAGINATION

            FIXED — NEVER SCROLLS
            ------------------------------------------------- */}

        <div className="flex h-[58px] shrink-0 items-center justify-between border-t border-[#e6e8ed] bg-white px-4">

          {/* Count */}
          <span className="text-[11px] text-[#647083]">
            Page {page} · {candidates.length} candidates
          </span>

          {/* Controls */}
          <div className="flex items-center gap-2">

            {/* Previous */}
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => dispatch(goToPreviousCandidatePage())}
              className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e1e5ea] text-[#687386] transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Current page */}
            <span className="grid h-8 min-w-8 place-items-center rounded-[8px] border border-[#e1e5ea] px-2 text-[11px] font-semibold text-[#283247]">
              {page}
            </span>

            {/* Total pages */}
            <span className="text-[11px] text-[#687386]">
              {isFetching ? "Loading" : ""}
            </span>

            {/* Next */}
            <button
              type="button"
              disabled={!nextCursor || isFetching}
              onClick={() => nextCursor && dispatch(goToNextCandidatePage(nextCursor))}
              className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e1e5ea] text-[#687386] transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>

          </div>
        </div>
      </main>

      {/* =================================================
          FILTER SIDEBAR
          ================================================= */}

      <CandidateFilters
        filters={filters}
        onSearch={(value) => dispatch(setCandidateSearch(value))}
        onToggleBand={(value) => dispatch(toggleCandidateBand(value))}
        onToggleFilter={(key, value) => dispatch(toggleCandidateFilter({ key, value }))}
      />
    </div>
  );
}
