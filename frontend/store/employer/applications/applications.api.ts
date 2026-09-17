import { baseApi } from "@/store/api/base-api";

export type EmployerApplicationStage =
  | "SUBMITTED"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "DECISION"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

export interface EmployerApplicationApiModel {
  id: string;
  jobId: string;
  candidateId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  outcome: "hired" | "rejected" | null;
  appliedDate: string;
  meetingLink: string;
  hireEmployerConfirmed: boolean;
  hireCandidateConfirmed: boolean;
  candidate: {
    id: string;
    name: string;
    initials: string;
    exactScore: number;
    location: string;
    jobTitle: string;
    unlocked: boolean;
  };
}

interface EmployerApplicationResponse {
  id: string;
  job_id: string;
  candidate_id: string;
  stage: EmployerApplicationStage;
  hire_confirmation: "NONE" | "PENDING" | "DISPUTED" | "CONFIRMED";
  interview: {
    interview_at: string;
    meeting_url: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface EmployerApplicationDetailResponse extends EmployerApplicationResponse {
  history: unknown[];
}

interface EmployerApplicationPage {
  items: EmployerApplicationResponse[];
  next_cursor: string | null;
}

const STAGE_TO_NUMBER: Record<EmployerApplicationStage, 0 | 1 | 2 | 3 | 4> = {
  SUBMITTED: 0,
  VIEWED: 1,
  SHORTLISTED: 2,
  INTERVIEW: 3,
  DECISION: 4,
  HIRED: 4,
  REJECTED: 4,
  WITHDRAWN: 4,
  EXPIRED: 4,
};

export function mapEmployerApplication(
  application: EmployerApplicationResponse,
  jobTitle = "Employer application",
): EmployerApplicationApiModel {
  const outcome =
    application.stage === "HIRED"
      ? "hired"
      : application.stage === "REJECTED" ||
          application.stage === "EXPIRED" ||
          application.stage === "WITHDRAWN"
        ? "rejected"
        : null;

  return {
    id: application.id,
    jobId: application.job_id,
    candidateId: application.candidate_id,
    stage: STAGE_TO_NUMBER[application.stage],
    outcome,
    appliedDate: new Date(application.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    meetingLink: application.interview?.meeting_url ?? "",
    hireEmployerConfirmed:
      application.stage === "HIRED" ||
      application.hire_confirmation === "PENDING" ||
      application.hire_confirmation === "CONFIRMED",
    hireCandidateConfirmed: application.hire_confirmation === "CONFIRMED",
    candidate: {
      id: application.candidate_id,
      name: "Masked candidate",
      initials: "MC",
      exactScore: 700,
      location: "Location not shared",
      jobTitle,
      unlocked: false,
    },
  };
}

export const employerApplicationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployerApplications: builder.query<
      { items: EmployerApplicationApiModel[]; nextCursor: string | null },
      { jobId: string; cursor?: string; limit?: number }
    >({
      query: ({ jobId, cursor, limit }) => ({
        url: "/employer/applications",
        method: "GET",
        params: {
          job_id: jobId,
          cursor,
          limit,
        },
      }),
      transformResponse: (
        response: EmployerApplicationPage,
      ) => ({
        items: response.items.map((application) =>
          mapEmployerApplication(application),
        ),
        nextCursor: response.next_cursor,
      }),
      providesTags: [{ type: "Application", id: "EMPLOYER_LIST" }],
    }),

    getEmployerApplication: builder.query<
      EmployerApplicationApiModel,
      string
    >({
      query: (applicationId) => ({
        url: `/employer/applications/${applicationId}`,
        method: "GET",
      }),
      transformResponse: (response: EmployerApplicationDetailResponse) =>
        mapEmployerApplication(response),
      providesTags: (_result, _error, applicationId) => [
        { type: "Application", id: applicationId },
      ],
    }),

    moveEmployerApplication: builder.mutation<
      EmployerApplicationApiModel,
      { applicationId: string; stage: "VIEWED" | "SHORTLISTED" | "INTERVIEW" | "DECISION" | "REJECTED" }
    >({
      query: ({ applicationId, stage }) => ({
        url: `/employer/applications/${applicationId}/stage`,
        method: "POST",
        body: { stage },
      }),
      transformResponse: (response: EmployerApplicationDetailResponse) =>
        mapEmployerApplication(response),
      invalidatesTags: [{ type: "Application", id: "EMPLOYER_LIST" }],
    }),

    proposeEmployerHire: builder.mutation<
      EmployerApplicationApiModel,
      string
    >({
      query: (applicationId) => ({
        url: `/employer/applications/${applicationId}/hire`,
        method: "POST",
      }),
      transformResponse: (response: EmployerApplicationDetailResponse) =>
        mapEmployerApplication(response),
      invalidatesTags: [{ type: "Application", id: "EMPLOYER_LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmployerApplicationsQuery,
  useLazyGetEmployerApplicationsQuery,
  useGetEmployerApplicationQuery,
  useLazyGetEmployerApplicationQuery,
  useMoveEmployerApplicationMutation,
  useProposeEmployerHireMutation,
} = employerApplicationsApi;