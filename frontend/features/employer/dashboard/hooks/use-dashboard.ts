"use client";

import { useMemo } from "react";

import { useGetEmployerSubscriptionQuery } from "@/store/employer/billing";
import { useGetEmployerJobsQuery } from "@/store/employer/jobs";

import type { EmployerJob } from "@/features/employer/jobs/types";
import type { EmployerDashboardData } from "../types";

const EMPTY_JOBS: EmployerJob[] = [];

function formatAccessEnd(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function useDashboard() {
  const jobsQuery = useGetEmployerJobsQuery({ limit: 100 });
  const subscriptionQuery = useGetEmployerSubscriptionQuery();
  const jobs = jobsQuery.data?.items ?? EMPTY_JOBS;

  const data = useMemo<EmployerDashboardData>(() => {
    const topJobs = jobs
      .map((job) => ({
        id: job.id,
        title: job.title,
        applicants: job.applicantsCount,
      }))
      .filter((job) => job.applicants > 0)
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 3);

    return {
      stats: {
        activeJobs: jobs.filter((job) => job.status === "live").length,
        applicantsInPipeline: jobs.reduce(
          (total, job) => total + job.applicantsInPipelineCount,
          0,
        ),
        interviewsInProgress: jobs.reduce(
          (total, job) => total + job.interviewCount,
          0,
        ),
        accessEnds: subscriptionQuery.data?.has_access
          ? formatAccessEnd(subscriptionQuery.data.current_period_end)
          : null,
        hasAccess: subscriptionQuery.data?.has_access ?? false,
      },
      topJobs,
    };
  }, [jobs, subscriptionQuery.data]);

  return {
    data,
    isLoading: jobsQuery.isLoading || subscriptionQuery.isLoading,
    isError: jobsQuery.isError || subscriptionQuery.isError,
    refetch: () => {
      void jobsQuery.refetch();
      void subscriptionQuery.refetch();
    },
  };
}
