export type CandidateBand = "ENTRY" | "DEVELOPING" | "SOLID" | "STRONG";
export type CandidateBadge = "COURSE_COMPLETED" | "MOCK_INTERVIEW_COMPLETED";

export interface Candidate {
  candidateId: string;
  band: CandidateBand;
  location: string;
  experienceYears: number;
  skills: string[];
  badges: CandidateBadge[];
}

export interface CandidateFiltersState {
  search: string;
  bands: CandidateBand[];
  skills: string[];
  locations: string[];
  experiences: string[];
  addons: CandidateBadge[];
}
