import { baseApi } from "@/store/api/base-api";
import type {
  ApiJobStatus,
  EmployerJob,
  EmployerJobApiResponse,
} from "@/features/employer/jobs/types";
import type { CreateJobFormValues } from "@/features/employer/jobs/create";

export interface ThresholdPreview {
  min_score: number;
  approximate_count: number;
  fewer_than_ten: boolean;
}

function jobBody(values: CreateJobFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    skills: values.skills,
    location: values.location.trim() || null,
    work_mode: "ONSITE" as const,
    salary_min_minor: Number(values.salaryMin) * 100,
    salary_max_minor: Number(values.salaryMax) * 100,
    min_score: values.minScore,
  };
}

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
    location: job.location ?? "Location not specified",
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
    previewEmployerJobThreshold: builder.query<ThresholdPreview, number>({
      query: (minScore) => ({ url: "/employer/jobs/threshold-preview", params: { min_score: minScore } }),
    }),
    createEmployerJob: builder.mutation<EmployerJobApiResponse, CreateJobFormValues>({
      query: (values) => ({ url: "/employer/jobs", method: "POST", body: jobBody(values) }),
      invalidatesTags: [{ type: "Job", id: "LIST" }],
    }),
    updateEmployerJob: builder.mutation<EmployerJobApiResponse, { id: string; values: CreateJobFormValues }>({
      query: ({ id, values }) => ({ url: `/employer/jobs/${id}`, method: "PATCH", body: jobBody(values) }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Job", id }, { type: "Job", id: "LIST" }],
    }),
    publishEmployerJob: builder.mutation<EmployerJobApiResponse, string>({
      query: (id) => ({ url: `/employer/jobs/${id}/publish`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Job", id }, { type: "Job", id: "LIST" }],
    }),
    pauseEmployerJob: builder.mutation<EmployerJobApiResponse, string>({
      query: (id) => ({ url: `/employer/jobs/${id}/pause`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Job", id }, { type: "Job", id: "LIST" }],
    }),
    closeEmployerJob: builder.mutation<EmployerJobApiResponse, string>({
      query: (id) => ({ url: `/employer/jobs/${id}/close`, method: "POST" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Job", id }, { type: "Job", id: "LIST" }],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetEmployerJobsQuery,
  useGetEmployerJobQuery,
  usePreviewEmployerJobThresholdQuery,
  useCreateEmployerJobMutation,
  useUpdateEmployerJobMutation,
  usePublishEmployerJobMutation,
  usePauseEmployerJobMutation,
  useCloseEmployerJobMutation,
} = employerJobsApi;
