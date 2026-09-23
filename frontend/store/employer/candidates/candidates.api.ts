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

export interface RevealedCandidateResponse {
  candidate_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  score: number;
  band: CandidateBand;
  experience_years: number;
  skills: string[];
  badges: CandidateBadge[];
  city: string | null;
  state_code: string | null;
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
    revealEmployerCandidate: builder.query<RevealedCandidateResponse, string>({
      query: (candidateId) => ({ url: `/employer/discovery/candidates/${candidateId}`, method: "GET" }),
      providesTags: (_result, _error, candidateId) => [{ type: "Candidate", id: candidateId }],
    }),
    revealEmployerCandidates: builder.query<
      Record<string, RevealedCandidateResponse>,
      string[]
    >({
      // Reveals every id in one hook. Each call is the audited reveal, so this
      // is subject to the organisation's per-hour/day view caps.
      async queryFn(ids, _api, _extraOptions, baseQuery) {
        if (ids.length === 0) {
          return { data: {} };
        }
        const results = await Promise.all(
          ids.map(async (id) => {
            const response = await baseQuery({
              url: `/employer/discovery/candidates/${id}`,
              method: "GET",
            });
            return response.error
              ? null
              : ([id, response.data as RevealedCandidateResponse] as const);
          }),
        );
        const map: Record<string, RevealedCandidateResponse> = {};
        for (const entry of results) {
          if (entry) {
            map[entry[0]] = entry[1];
          }
        }
        return { data: map };
      },
      providesTags: (result) =>
        result
          ? Object.keys(result).map((id) => ({ type: "Candidate" as const, id }))
          : [{ type: "Candidate" as const, id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSearchEmployerCandidatesQuery,
  useLazyRevealEmployerCandidateQuery,
  useRevealEmployerCandidatesQuery,
  useLazyRevealEmployerCandidatesQuery,
} = employerCandidatesApi;
