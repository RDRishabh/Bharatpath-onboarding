export type OutcomeStage =
  | "Applied"
  | "Shortlisted"
  | "Interview"
  | "Hired";

export type AnalyticsCohort = "2025-26" | "2024-25" | "all";

export interface AnalyticsMetric {
  id: string;
  value: number;
  label: string;
  delta: number;
  deltaLabel: string;
}

export interface CourseScore {
  label: string;
  score: number;
}

export interface SkillGap {
  label: string;
  percentageBelowMedian: number;
}

export interface Outcome {
  id: string;
  role: string;
  employer: string;
  applied: string;
  stage: OutcomeStage;
  students: number;
}

export interface SeatUsage {
  used: number;
  total: number;
}

export interface CollegeAnalytics {
  seats: SeatUsage;
  metrics: AnalyticsMetric[];
  courseScores: CourseScore[];
  skillGaps: SkillGap[];
  outcomes: Outcome[];
}
