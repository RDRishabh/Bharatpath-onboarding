export type EmploymentType = "Full time" | "Part time" | "Contract";

export interface CreateJobFormValues {
  title: string;
  employmentType: EmploymentType;
  location: string;
  description: string;
  skills: string[];
  salaryMin: number | "";
  salaryMax: number | "";
  minScore: number;
}

export interface JobCreateResult {
  id: string;
  status: "draft" | "live";
  applicantsCount: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  employmentType: EmploymentType;
  location: string;
  description: string;
  skills: string[];
  salaryMin: number | "";
  salaryMax: number | "";
  minScore: number;
}
