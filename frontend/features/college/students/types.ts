export type StudentStatus =
  | "linked"
  | "invited"
  | "consent_pending";

export type ScoreBand =
  | "building"
  | "strong"
  | "exceptional"
  | "not_scored";

export interface CollegeStudent {
  id: string;
  name: string;
  email: string;
  course: string;
  year: string;
  status: StudentStatus;
  scoreBand?: ScoreBand;
  score?: number;
  lastActive?: string;
}

export interface StudentListResponse {
  students: CollegeStudent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InviteStudentRequest {
  email: string;
  name?: string;
}

export interface StudentFilters {
  search?: string;
  status?: StudentStatus | "all";
  course?: string;
  page?: number;
  pageSize?: number;
}