export type MatchStatusType =
  | 'MATCH'
  | 'SHORT'
  | 'INTERVIEW'
  | 'SENT'
  | 'EXPIRING'
  | 'PAID'
  | 'BAND';

export interface JobItem {
  id: string;
  company: string;
  title: string;
  location: string;
  experience: string;
  salary: string;
  matchScore?: number;
  matchType?: MatchStatusType;
  skills: string[];
  description?: string;
  postedDate?: string;
  isSaved?: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  appliedAt: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'rejected';
}
