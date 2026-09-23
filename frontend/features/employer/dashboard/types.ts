export interface EmployerDashboardStats {
  activeJobs: number;
  applicantsInPipeline: number;
  interviewsInProgress: number;
  accessEnds: string | null;
  hasAccess: boolean;
}

export interface EmployerTopJob {
  id: string;
  title: string;
  applicants: number;
}

export interface EmployerDashboardData {
  stats: EmployerDashboardStats;
  topJobs: EmployerTopJob[];
}