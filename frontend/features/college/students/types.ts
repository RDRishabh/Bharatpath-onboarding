/*
 * These mirror what the backend actually exposes. A college only ever sees
 * students who have granted INDIVIDUAL visibility, and the list endpoint is
 * deliberately narrow (name + when they became visible) so that rendering the
 * roster does not open — and therefore audit — every student. Score, band and
 * activity counts come only from opening a single student.
 */

export type StudentStatus =
  | "linked"
  | "invited"
  | "consent_pending";

export type ScoreBand =
  | "building"
  | "strong"
  | "exceptional"
  | "not_scored";

/* A row in the visible-students roster (INDIVIDUAL consent). */
export interface CollegeStudent {
  id: string;
  name: string;
  status: StudentStatus;
  visibleSince: string;
  scoreBand?: ScoreBand;
  score?: number | null;
}

export interface StudentHire {
  jobTitle: string;
  employerName: string;
  hiredAt: string;
  source: "PLATFORM";
}

/* A single student opened from the roster. */
export interface CollegeStudentDetail extends CollegeStudent {
  scoredAt: string | null;
  applications: number;
  interviews: number;
  hires: StudentHire[];
}

export interface StudentFilters {
  search?: string;
  status?: StudentStatus | "all";
}