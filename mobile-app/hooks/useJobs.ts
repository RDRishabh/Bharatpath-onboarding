import { useState, useEffect } from 'react';
import { JobItem } from '@/types/job';
import { fetchRecommendedJobs, searchJobs as searchJobsApi } from '@/services/api/jobs';

export function useJobs() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await fetchRecommendedJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const search = async (query: string) => {
    try {
      setLoading(true);
      const results = await searchJobsApi(query);
      setJobs(results);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    jobs,
    loading,
    error,
    reload: loadJobs,
    search,
  };
}
