import type { CandidateBadge, CandidateBand } from "./types";

export const BAND_DEFS: { key: CandidateBand; label: string }[] = [
  { key: "ENTRY", label: "Entry" },
  { key: "DEVELOPING", label: "Developing" },
  { key: "SOLID", label: "Solid" },
  { key: "STRONG", label: "Strong" },
];

export const SKILLS = [
  "Warehouse ops",
  "Quality inspection",
  "Forklift certified",
  "Inventory mgmt",
  "Safety compliance",
  "Team supervision",
  "Basic English",
  "Hindi typing",
];

export const LOCATIONS = ["Pune", "Nashik", "Aurangabad"];

export const EXPERIENCE_DEFS = [
  { key: "1", label: "1+ yrs" },
  { key: "3", label: "3+ yrs" },
  { key: "6", label: "6+ yrs" },
];

export const ADDONS: { key: CandidateBadge; label: string }[] = [
  { key: "MOCK_INTERVIEW_COMPLETED", label: "Mock interview completed" },
  { key: "COURSE_COMPLETED", label: "Course completed" },
];
