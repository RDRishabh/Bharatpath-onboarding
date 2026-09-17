"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { usePageHeader } from "@/components/layout/header-context";

import { CANDIDATES, candidateBand } from "./data";
import { CandidateCard } from "./candidate-card";
import { CandidateFilters } from "./candidate-filters";
import { CandidateUnlockDialog } from "./candidate-unlock-dialog";

import type {
  Candidate,
  CandidateFiltersState,
} from "./types";

const PAGE_SIZE = 4;

const initialFilters: CandidateFiltersState = {
  search: "",
  bands: [],
  skills: [],
  locations: [],
  experiences: [],
  addons: [],
};

export function CandidatesPage() {
  usePageHeader(
    "Candidates",
    "Search the masked candidate pool by score, skills and location"
  );

  const [filters, setFilters] =
    useState<CandidateFiltersState>(initialFilters);

  const [sort, setSort] = useState("best");

  const [page, setPage] = useState(1);

  const [unlockCandidate, setUnlockCandidate] =
    useState<Candidate | null>(null);

  const [candidates, setCandidates] =
    useState<Candidate[]>(CANDIDATES);

  const credits = 8;

  /* =====================================================
     FILTER + SORT
     ===================================================== */

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    const result = candidates.filter((candidate) => {
      /* Score band */
      if (
        filters.bands.length > 0 &&
        !filters.bands.includes(
          candidateBand(candidate.exactScore)
        )
      ) {
        return false;
      }

      /* Skills */
      if (
        filters.skills.length > 0 &&
        !filters.skills.every((skill) =>
          candidate.skills.includes(skill)
        )
      ) {
        return false;
      }

      /* Location */
      if (
        filters.locations.length > 0 &&
        !filters.locations.includes(
          candidate.location.split(" · ")[0]
        )
      ) {
        return false;
      }

      /* Experience */
      if (filters.experiences.length > 0) {
        const years = candidate.experienceYears;

        const matches = filters.experiences.some((band) => {
          if (band === "0-2") {
            return years <= 2;
          }

          if (band === "3-5") {
            return years >= 3 && years <= 5;
          }

          if (band === "6+") {
            return years >= 6;
          }

          return false;
        });

        if (!matches) {
          return false;
        }
      }

      /* Add-ons */
      if (
        filters.addons.length > 0 &&
        !filters.addons.every((addon) =>
          candidate.badges.includes(
            addon as Candidate["badges"][number]
          )
        )
      ) {
        return false;
      }

      /* Search */
      if (query) {
        const haystack = `
          ${candidate.name}
          ${candidate.skills.join(" ")}
          ${candidate.location}
        `.toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });

    /* Sort */
    if (sort === "score") {
      return [...result].sort(
        (a, b) => b.exactScore - a.exactScore
      );
    }

    return result;
  }, [candidates, filters, sort]);

  /* =====================================================
     PAGINATION
     ===================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const startIndex =
    (safePage - 1) * PAGE_SIZE;

  const endIndex =
    startIndex + PAGE_SIZE;

  const visible = filtered.slice(
    startIndex,
    endIndex
  );

  /* =====================================================
     UNLOCK
     ===================================================== */

  function unlock() {
    if (!unlockCandidate) {
      return;
    }

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === unlockCandidate.id
          ? {
              ...candidate,
              unlocked: true,
            }
          : candidate
      )
    );

    setUnlockCandidate(null);
  }

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
            {filtered.length === 0
              ? "Showing 0 of 0 candidates"
              : `Showing ${
                  startIndex + 1
                }–${Math.min(
                  endIndex,
                  filtered.length
                )} of ${filtered.length} candidates`}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#697385]">
              Sort:
            </span>

            <AppSelect
              value={sort}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
              options={[
                {
                  value: "best",
                  label: "Best match",
                },
                {
                  value: "score",
                  label: "Highest score",
                },
              ]}
              className="w-[116px]"
            />
          </div>
        </div>

        {/* -------------------------------------------------
            CANDIDATE LIST

            THIS IS THE ONLY SCROLLABLE AREA
            ------------------------------------------------- */}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">

          <div className="flex flex-col gap-3">

            {visible.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onUnlock={setUnlockCandidate}
              />
            ))}

            {visible.length === 0 && (
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
            Showing{" "}
            {filtered.length > 0
              ? startIndex + 1
              : 0}
            –
            {Math.min(
              endIndex,
              filtered.length
            )}{" "}
            of {filtered.length} candidates
          </span>

          {/* Controls */}
          <div className="flex items-center gap-2">

            {/* Previous */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setPage((currentPage) =>
                  Math.max(
                    1,
                    currentPage - 1
                  )
                );
              }}
              className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e1e5ea] text-[#687386] transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Current page */}
            <span className="grid h-8 min-w-8 place-items-center rounded-[8px] border border-[#e1e5ea] px-2 text-[11px] font-semibold text-[#283247]">
              {safePage}
            </span>

            {/* Total pages */}
            <span className="text-[11px] text-[#687386]">
              of {totalPages}
            </span>

            {/* Next */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setPage((currentPage) =>
                  Math.min(
                    totalPages,
                    currentPage + 1
                  )
                );
              }}
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
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {/* =================================================
          UNLOCK DIALOG
          ================================================= */}

      <CandidateUnlockDialog
        candidate={unlockCandidate}
        credits={credits}
        onCancel={() =>
          setUnlockCandidate(null)
        }
        onConfirm={unlock}
      />
    </div>
  );
}