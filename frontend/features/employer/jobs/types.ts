export type JobStatus = "live" | "draft" | "paused" | "closed";

export interface EmployerJob {
  id: string;
  title: string;
  status: JobStatus;
  location: string;
  salaryMin: number;
  salaryMax: number;
  minScore: number | null;
  applicantsCount: number;
  viewedCount: number;
  shortlistedCount: number;
  interviewCount: number;
  hiredCount: number;
  rejectedCount: number;
  skills: string[];
}

export type ApiJobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "PAUSED"
  | "CLOSED";

export type JobWorkMode =
  | "ONSITE"
  | "HYBRID"
  | "REMOTE";

export interface EmployerJobApiResponse {
  id: string;
  title: string;
  description: string;
  skills: string[];
  location: string;
  work_mode: JobWorkMode;
  experience_min_months: number;
  salary_min_minor: number;
  salary_max_minor: number;
  min_score: number | null;
  status: ApiJobStatus;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
}
