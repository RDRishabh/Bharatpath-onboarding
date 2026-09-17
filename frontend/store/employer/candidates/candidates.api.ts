import { baseApi } from "@/store/api/base-api";
import type { Candidate, CandidateBadge, CandidateBand } from "@/features/employer/candidates/types";

interface MaskedCandidateResponse {
  candidate_id: string;
  band: CandidateBand;
  experience_years: number;
  skills: string[];
  badges: CandidateBadge[];
  city: string | null;
  state_code: string | null;
}

interface CandidatePageResponse {
  items: MaskedCandidateResponse[];
  next_cursor: string | null;
}

export interface EmployerCandidatesQuery {
  band?: CandidateBand[];
  skill?: string[];
  badge?: CandidateBadge[];
  min_experience_years?: number;
  city?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

function mapCandidate(candidate: MaskedCandidateResponse): Candidate {
  return {
    candidateId: candidate.candidate_id,
    band: candidate.band,
    experienceYears: candidate.experience_years,
    location: [candidate.city, candidate.state_code].filter(Boolean).join(" · ") || "Location not shared",
    skills: candidate.skills,
    badges: candidate.badges,
  };
}

export const employerCandidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchEmployerCandidates: builder.query<
      { items: Candidate[]; nextCursor: string | null },
      EmployerCandidatesQuery
    >({
      query: (params) => ({
        url: "/employer/discovery/candidates",
        method: "GET",
        params,
      }),
      transformResponse: (response: CandidatePageResponse) => ({
        items: response.items.map(mapCandidate),
        nextCursor: response.next_cursor,
      }),
      providesTags: [{ type: "Candidate" as const, id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useSearchEmployerCandidatesQuery } = employerCandidatesApi;