export interface EmployerDashboardStats {
  activeJobs: number;
  totalApplicants: number;
  candidatesUnlocked: number;
  creditBalance: number;
}

export interface EmployerTopJob {
  id: string;
  title: string;
  applicants: number;
}

export type EmployerActivityType =
  | "link"
  | "upload"
  | "hire"
  | "invoice";

export interface RecentActivity {
  id: string;
  text: string;
  time: string;
  type: EmployerActivityType;
}

export interface EmployerDashboardData {
  stats: EmployerDashboardStats;
  topJobs: EmployerTopJob[];
  recentActivity: RecentActivity[];
}