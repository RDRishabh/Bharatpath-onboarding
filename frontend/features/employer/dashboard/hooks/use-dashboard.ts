"use client";

import { useEffect, useMemo, useState } from "react";
import { useLazyGetEmployerApplicationsQuery } from "@/store/employer/applications";
import { useGetEmployerJobsQuery } from "@/store/employer/jobs";
import type { EmployerJob } from "@/features/employer/jobs/types";
import type { EmployerDashboardData } from "../types";

const EMPTY_JOBS: EmployerJob[] = [];

export function useDashboard(): { data: EmployerDashboardData; isLoading: boolean } {
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useGetEmployerJobsQuery();
  const jobs = jobsError ? EMPTY_JOBS : jobsData ?? EMPTY_JOBS;
  const [loadApplications] = useLazyGetEmployerApplicationsQuery();
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Stays true until every job's applications have been counted, so the
  // dashboard shows the skeleton instead of a flash of zero applicants.
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (jobsLoading) return () => { active = false; };
    if (jobsError || jobs.length === 0) {
      setCounts({});
      setCountsLoading(false);
      return () => { active = false; };
    }
    setCountsLoading(true);
    void Promise.all(jobs.map(async (job) => {
      const response = await loadApplications({ jobId: job.id, limit: 100 }).unwrap();
      return [job.id, response.items.length] as const;
    })).then((entries) => {
      if (active) { setCounts(Object.fromEntries(entries)); setCountsLoading(false); }
    }).catch(() => {
      if (active) { setCounts({}); setCountsLoading(false); }
    });
    return () => { active = false; };
  }, [jobs, jobsError, jobsLoading, loadApplications]);

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
