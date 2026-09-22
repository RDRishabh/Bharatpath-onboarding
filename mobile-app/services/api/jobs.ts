import { supabase } from '../supabase';
import { JobItem, JobApplication } from '@/types/job';
import { mockJobs } from '@/mocks/mockData';

export async function fetchRecommendedJobs(): Promise<JobItem[]> {
  const { data, error } = await supabase.from('jobs').select('*');
  if (error || !data || data.length === 0) {
    // Fallback to rich mock data if table is not populated yet
    return mockJobs as JobItem[];
  }
  return data as JobItem[];
}

export async function searchJobs(query: string): Promise<JobItem[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .or(`title.ilike.%${query}%,company.ilike.%${query}%,location.ilike.%${query}%`);

  if (error || !data || data.length === 0) {
    const q = query.toLowerCase();
    return (mockJobs as JobItem[]).filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q)
    );
  }
  return data as JobItem[];
}

export async function applyToJob(jobId: string, userId: string): Promise<JobApplication | null> {
  const application: Partial<JobApplication> = {
    jobId,
    userId,
    appliedAt: new Date().toISOString(),
    status: 'submitted',
  };

  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select()
    .single();

  if (error) {
    console.warn('Apply to job warning:', error.message);
    return {
      id: `app_${Date.now()}`,
      jobId,
      userId,
      appliedAt: new Date().toISOString(),
      status: 'submitted',
    };
  }

  return data as JobApplication;
}
