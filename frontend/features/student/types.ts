/*
 * ==========================================================================
 * STUDENT PORTAL — DOMAIN TYPES
 *
 * The candidate-facing mobile app ("Student Portal"). These types describe the
 * static/mock shape of everything the UI renders. They are intentionally
 * decoupled from any backend contract so the API layer can be added later
 * without reshaping the components.
 * ==========================================================================
 */

export type ScoreBand = 1 | 2 | 3 | 4;

export interface ScoreCategory {
  key: string;
  label: string;
  /** 0–100 sub-score for this category. */
  value: number;
  /** One-line, plain-language explanation shown under the meter. */
  note: string;
  /** "strong" tints the meter indigo; "weak" uses the muted indigo. */
  emphasis: "strong" | "weak" | "neutral";
  /** Optional improvement affordance (drives the "+N" fix button). */
  fix?: {
    label: string;
    points: number;
  };
}

export interface StudentScore {
  /** The resume score, 700–990 in production; mocked here in that range. */
  value: number;
  max: number;
  /** Change since the last computation, e.g. +26. */
  delta: number;
  /** 1..4 — the band an employer filters by. */
  band: ScoreBand;
  bandCount: number;
  bandLabel: string;
  /** Points to the next band, shown as "28 to Building". */
  toNextBand: number;
  nextBandLabel: string;
  categories: ScoreCategory[];
}

export interface ImprovementFix {
  id: string;
  index: number;
  category: string;
  title: string;
  description: string;
  points: number;
  /** Suggested skills to add, when the fix is a skills fix. */
  skills?: string[];
  /** Label for the primary action button. */
  actionLabel: string;
}

export interface StudentProfile {
  fullName: string;
  initials: string;
  greetingName: string;
  email: string;
  phoneMasked: string;
  location: string;
  college: string;
  degree: string;
  branch: string;
  graduationYear: string;
  language: "English" | "हिन्दी";
  /** 0–100 completion of the structured profile. */
  profileCompletion: number;
  skills: string[];
  resumeFileName: string;
}

export type JobMatch = "match" | "short";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyVerified: boolean;
  monogram: string;
  /** Tailwind-ready tint key for the monogram tile. */
  monogramTint: "navy" | "indigo" | "amber";
  salaryLabel: string;
  location: string;
  distanceKm: number | null;
  requiredScore: number;
  match: JobMatch;
  /** When short of the bar, how many points are missing. */
  pointsShort?: number;
  postedAgo: string;
  applicantCount: number;
  workMode: "Onsite" | "Remote" | "Hybrid";
  category: string;
  isFresher: boolean;
  isDayShift: boolean;
  responsibilities: string;
  skills: string[];
  /** The single fix that closes the gap on a blocked job. */
  closingFix?: {
    title: string;
    points: number;
  };
}

export type ApplicationStatus =
  | "SUBMITTED"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationStage {
  label: string;
  reached: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string;
  title: string;
  company: string;
  monogram: string;
  appliedOn: string;
  status: ApplicationStatus;
  /** Human label for the current stage strip. */
  stageLabel: string;
  /** 1..5 — how far along the 5-segment stage strip. */
  stageIndex: number;
  /** Optional next-step hint, e.g. "Interview scheduled". */
  nextStep?: string;
  /** Optional interview detail when the application advanced. */
  interview?: {
    when: string;
    mode: string;
    withWhom: string;
  };
  timeline: ApplicationStage[];
}

export interface AddOnCard {
  id: string;
  key: "attribute" | "interview";
  title: string;
  subtitle: string;
  priceLabel: string;
  isFree: boolean;
  /** Tailwind-ready pastel background for the art card. */
  tint: string;
  border: string;
}

export interface ProfileView {
  id: string;
  company: string;
  monogram: string;
  when: string;
  action: string;
}
