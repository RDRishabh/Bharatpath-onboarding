"use client";

import { useEffect, useMemo, useState } from "react";
import { useLazyGetEmployerApplicationsQuery } from "@/store/employer/applications";
import { useGetEmployerJobsQuery } from "@/store/employer/jobs";
import type { EmployerJob } from "@/features/employer/jobs/types";
import type { EmployerDashboardData } from "../types";

const EMPTY_JOBS: EmployerJob[] = [];
const EMPTY_COUNTS: Record<string, number> = {};

interface ApplicationCountsState {
  jobKey: string;
  counts: Record<string, number>;
}

export function useDashboard(): { data: EmployerDashboardData; isLoading: boolean } {
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useGetEmployerJobsQuery();
  const jobs = jobsError ? EMPTY_JOBS : jobsData ?? EMPTY_JOBS;
  const [loadApplications] = useLazyGetEmployerApplicationsQuery();
  const [countsState, setCountsState] = useState<ApplicationCountsState>({
    jobKey: "",
    counts: {},
  });
  const jobKey = jobs.map((job) => job.id).join(":");
  const counts = countsState.jobKey === jobKey ? countsState.counts : EMPTY_COUNTS;
  const countsLoading =
    !jobsError && jobs.length > 0 && countsState.jobKey !== jobKey;

  useEffect(() => {
    let active = true;

    if (jobsLoading || jobsError || jobs.length === 0) {
      return () => { active = false; };
    }

    void Promise.all(jobs.map(async (job) => {
      let count = 0;
      let cursor: string | undefined;

      do {
        const response = await loadApplications({
          jobId: job.id,
          cursor,
          limit: 100,
        }).unwrap();
        count += response.items.length;
        cursor = response.nextCursor ?? undefined;
      } while (cursor);

      return [job.id, count] as const;
    })).then((entries) => {
      if (active) {
        setCountsState({ jobKey, counts: Object.fromEntries(entries) });
      }
    }).catch(() => {
      if (active) {
        setCountsState({ jobKey, counts: {} });
      }
    });
    return () => { active = false; };
  }, [jobKey, jobs, jobsError, jobsLoading, loadApplications]);

  const data = useMemo<EmployerDashboardData>(() => {
    const topJobs = jobs.map((job) => ({ id: job.id, title: job.title, applicants: counts[job.id] ?? 0 }))
      .sort((a, b) => b.applicants - a.applicants).slice(0, 3);
    return {
      stats: {
        activeJobs: jobs.filter((job) => job.status === "live").length,
        totalApplicants: Object.values(counts).reduce((total, count) => total + count, 0),
        candidatesUnlocked: 0,
        creditBalance: 0,
      },
      topJobs,
      recentActivity: [],
    };
  }, [counts, jobs]);

  return {
    data,
    isLoading: jobsLoading || countsLoading,
  };
}
