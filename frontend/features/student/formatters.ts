import type {
  ApplicationStatus,
  JobApplication,
  JobListing,
} from "./types";

const STAGE_ORDER: ApplicationStatus[] = [
  "SUBMITTED",
  "VIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "DECISION",
  "HIRED",
];

export function initials(name: string | null | undefined): string {
  if (!name) return "ST";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function employerMonogram(name: string | null): string {
  return initials(name || "Employer");
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatSalary(job: JobListing): string {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(job.salaryMinMinor / 100)}–${formatter.format(
    job.salaryMaxMinor / 100,
  )}`;
}

export function workModeLabel(
  mode: JobListing["workMode"],
): string {
  if (!mode) return "Work mode not specified";
  return mode[0] + mode.slice(1).toLowerCase();
}

export function stageLabel(stage: ApplicationStatus): string {
  return {
    SUBMITTED: "Sent",
    VIEWED: "Viewed",
    SHORTLISTED: "Shortlisted",
    INTERVIEW: "Interview",
    DECISION: "Decision",
    HIRED: "Hired",
    REJECTED: "Closed",
    WITHDRAWN: "Withdrawn",
    EXPIRED: "Expired",
  }[stage];
}

export function stageIndex(stage: ApplicationStatus): number {
  if (stage === "REJECTED" || stage === "WITHDRAWN" || stage === "EXPIRED") {
    return 5;
  }
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0) return 1;
  return Math.min(5, index + 1);
}

export function applicationTimeline(application: JobApplication) {
  const labels = ["Applied", "Profile viewed", "Shortlisted", "Interview", "Decision"];
  const current = stageIndex(application.stage);
  return labels.map((label, index) => ({
    label,
    reached: index < current,
  }));
}
