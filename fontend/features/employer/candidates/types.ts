export type CandidateBand = "building" | "strong" | "exceptional";
export type CandidateBadge = "mock" | "attribute" | "addons";

export interface Candidate {
  id: string;
  name: string;
  exactScore: number;
  location: string;
  experienceYears: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  badges: CandidateBadge[];
  unlocked?: boolean;
}

export interface CandidateFiltersState {
  search: string;
  bands: CandidateBand[];
  skills: string[];
  locations: string[];
  experiences: string[];
  addons: string[];
}
