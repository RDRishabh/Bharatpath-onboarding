"use client";

import { JobCreatePage } from "@/features/employer/jobs/create";
import type { CreateJobFormValues } from "@/features/employer/jobs/create";
import type { EmployerJobApiResponse } from "@/features/employer/jobs/types";
import { useGetEmployerJobQuery } from "@/store/employer/jobs";
import { ErrorState } from "@/components/ui";
import { JobFormSkeleton } from "../../components/job-form-skeleton";

function mapApiJobToFormValues(
  job: EmployerJobApiResponse,
): CreateJobFormValues {
  return {
    title: job.title,

    /*
     * Not returned by GET /employer/jobs/:id yet —
     * defaults to the same value the create form starts with.
     */
    employmentType: "Full time",

    location: job.location ?? "",
    description: job.description,
    skills: job.skills,
    salaryMin: job.salary_min_minor / 100,
    salaryMax: job.salary_max_minor / 100,
    minScore: job.min_score ?? 750,
  };
}

export interface JobEditPageProps {
  jobId: string;
}

export function JobEditPage({ jobId }: JobEditPageProps) {
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useGetEmployerJobQuery(jobId);

  if (isLoading) {
    return <JobFormSkeleton />;
  }

  if (isError || !job) {
    return (
      <main className="grid min-h-full place-items-center bg-[#f7f8fa] p-6">
        <ErrorState
          variant="block"
          error={error}
          fallback="Couldn't load this job."
        />
      </main>
    );
  }

  return (
    <JobCreatePage
      heading="Edit job"
      jobId={jobId}
      initialValues={mapApiJobToFormValues(job)}
    />
  );
}
