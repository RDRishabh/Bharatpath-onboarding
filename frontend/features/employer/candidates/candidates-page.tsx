"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { ListSkeleton } from "@/components/common/loading";
import { CursorPagination, ErrorState } from "@/components/ui";
import { usePageHeader } from "@/components/layout/header-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  goToNextCandidatePage,
  goToPreviousCandidatePage,
  selectEmployerCandidateCursor,
  selectEmployerCandidateFilters,
  selectEmployerCandidatePage,
  selectEmployerCandidatePageSize,
  setCandidatePageSize,
  setCandidateSearch,
  toggleCandidateBand,
  toggleCandidateFilter,
  useSearchEmployerCandidatesQuery,
  useLazyRevealEmployerCandidateQuery,
  useRevealEmployerCandidatesQuery,
  type RevealedCandidateResponse,
} from "@/store/employer/candidates";

import { CandidateCard } from "./candidate-card";
import { CandidateFilters } from "./candidate-filters";
import type { Candidate } from "./types";

const EMPTY_CANDIDATES: Candidate[] = [];

export function CandidatesPage() {
  usePageHeader(
    "Candidates",
    "Search candidates by score, skills and location"
  );

  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectEmployerCandidateFilters);
  const page = useAppSelector(selectEmployerCandidatePage);
  const cursor = useAppSelector(selectEmployerCandidateCursor);
  const pageSize = useAppSelector(selectEmployerCandidatePageSize);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const query = useMemo(() => ({
    q: deferredSearch || undefined,
    band: filters.bands.length ? filters.bands : undefined,
    skill: filters.skills.length ? filters.skills : undefined,
    badge: filters.addons.length ? filters.addons : undefined,
    city: filters.locations[0],
    min_experience_years: filters.experiences.length
      ? Number(filters.experiences[0])
      : undefined,
    cursor: cursor || undefined,
    limit: pageSize,
  }), [
    cursor,
    deferredSearch,
    filters.addons,
    filters.bands,
    filters.experiences,
    filters.locations,
    filters.skills,
    pageSize,
  ]);

  const { data, error, isLoading, isFetching } = useSearchEmployerCandidatesQuery(query);
  const candidates = data?.items ?? EMPTY_CANDIDATES;
  const nextCursor = data?.nextCursor ?? null;
  const [revealCandidate, revealState] = useLazyRevealEmployerCandidateQuery();
  const [revealed, setRevealed] = useState<RevealedCandidateResponse | null>(null);

  // Reveal every visible candidate before rendering cards so masked search
  // results never flash while the full profiles load.
  const candidateIds = useMemo(
    () => candidates.map((candidate) => candidate.candidateId),
    [candidates],
  );
  const { data: revealedMap, isFetching: candidatesRevealing } =
    useRevealEmployerCandidatesQuery(candidateIds, {
      skip: candidateIds.length === 0,
    });
  const isCandidateListLoading = isLoading || candidatesRevealing;
  const displayedCandidates = useMemo(
    () =>
      candidates.map((candidate) => {
        const match = revealedMap?.[candidate.candidateId];
        return match
          ? {
              ...candidate,
              fullName: match.full_name,
              phone: match.phone,
              email: match.email,
              score: match.score,
            }
          : candidate;
      }),
    [candidates, revealedMap],
  );

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

            {isCandidateListLoading && (
              <ListSkeleton rows={6} trailing />
            )}

            {!isCandidateListLoading && candidates.map((candidate) => (
              <CandidateCard
                key={candidate.candidateId}
                candidate={displayedCandidates.find((item) => item.candidateId === candidate.candidateId) ?? candidate}
                onReveal={() => void revealCandidate(candidate.candidateId).unwrap().then(setRevealed).catch(() => undefined)}
              />
            ))}

            {error && (
              <ErrorState
                error={error}
                fallback="Candidates could not be loaded. Check your employer subscription and API connection."
              />
            )}

            {!isCandidateListLoading && !error && candidates.length === 0 && (
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

        <CursorPagination
          currentPage={page}
          itemCount={candidates.length}
          pageSize={pageSize}
          hasNextPage={Boolean(nextCursor)}
          isLoading={isFetching}
          onPreviousPage={() => dispatch(goToPreviousCandidatePage())}
          onNextPage={() => {
            if (nextCursor) {
              dispatch(goToNextCandidatePage(nextCursor));
            }
          }}
          onPageSizeChange={(size) => dispatch(setCandidatePageSize(size))}
          itemLabel={candidates.length === 1 ? "candidate" : "candidates"}
          className="h-[58px] shrink-0 px-4"
        />
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
      {(revealed || revealState.isFetching || revealState.isError) && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
        <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
          {revealState.isFetching ? <p className="text-sm">Opening candidate…</p> : revealState.isError ? <ErrorState error={revealState.error} fallback="This profile could not be opened." /> : revealed && <>
            <h2 className="text-lg font-bold">{revealed.full_name ?? "Candidate"}</h2>
            <p className="mt-1 text-sm text-[#647083]">Score {revealed.score} · {revealed.band}</p>
            <div className="mt-4 space-y-1 text-sm"><p>{revealed.email ?? "No email shared"}</p><p>{revealed.phone ?? "No phone shared"}</p></div>
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase text-[#687384]">Skills</h3>
              {revealed.skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {revealed.skills.map((skill) => <span key={skill} className="rounded-full bg-[#f2f4f7] px-2 py-1 text-xs">{skill}</span>)}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#8a92a0]">No skills were provided.</p>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase text-[#687384]">Completed add-ons</h3>
              <p className="mt-2 text-sm text-[#8a92a0]">
                {revealed.badges.length > 0
                  ? revealed.badges.map((badge) => badge === "MOCK_INTERVIEW_COMPLETED" ? "Mock interview" : "Course completed").join(", ")
                  : "No completed add-ons."}
              </p>
            </div>
          </>}
          <button type="button" onClick={() => { setRevealed(null); revealState.reset(); }} className="mt-5 rounded-lg border px-3 py-2 text-xs font-semibold">Close</button>
        </section>
      </div>}
    </div>
  );
}
