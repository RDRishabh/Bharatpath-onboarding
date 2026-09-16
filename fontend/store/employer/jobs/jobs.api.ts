import { baseApi } from "@/store/api/base-api";
import type {
  ApiJobStatus,
  EmployerJob,
  EmployerJobApiResponse,
} from "@/features/employer/jobs/types";

const API_STATUS_TO_JOB_STATUS: Record<
  ApiJobStatus,
  EmployerJob["status"]
> = {
  DRAFT: "draft",
  PUBLISHED: "live",
  PAUSED: "paused",
  CLOSED: "closed",
};

function mapApiJobToEmployerJob(
  job: EmployerJobApiResponse,
): EmployerJob {
  return {
    id: job.id,
    title: job.title,
    status: API_STATUS_TO_JOB_STATUS[job.status],
    location: job.location,
    salaryMin: job.salary_min_minor / 100,
    salaryMax: job.salary_max_minor / 100,
    minScore: job.min_score,
    skills: job.skills,

    /*
     * Not returned by GET /employer/jobs yet —
     * pipeline metrics come from a different endpoint later.
     */
    applicantsCount: 0,
    viewedCount: 0,
    shortlistedCount: 0,
    interviewCount: 0,
    hiredCount: 0,
    rejectedCount: 0,
  };
}

export const employerJobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployerJobs: builder.query<
      EmployerJob[],
      { status?: ApiJobStatus } | void
    >({
      query: (params) => ({
        url: "/employer/jobs",
        method: "GET",
        params: params?.status
          ? { status: params.status }
          : undefined,
      }),

      transformResponse: (
        response: EmployerJobApiResponse[],
      ) => response.map(mapApiJobToEmployerJob),

      providesTags: (result) =>
        result
          ? [
              ...result.map((job) => ({
                type: "Job" as const,
                id: job.id,
              })),
              { type: "Job" as const, id: "LIST" },
            ]
          : [{ type: "Job" as const, id: "LIST" }],
    }),

    getEmployerJob: builder.query<
      EmployerJobApiResponse,
      string
    >({
      query: (id) => ({
        url: `/employer/jobs/${id}`,
        method: "GET",
      }),

      providesTags: (_result, _error, id) => [
        { type: "Job" as const, id },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetEmployerJobsQuery,
  useGetEmployerJobQuery,
} = employerJobsApi;
