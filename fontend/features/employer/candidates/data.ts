import type { Candidate, CandidateBand } from "./types";

export const CANDIDATES: Candidate[] = [
  {
    id: "c1",
    name: "S. Deshmukh",
    exactScore: 706,
    location: "Pune · Kothrud area",
    experienceYears: 2,
    salaryMin: 16000,
    salaryMax: 20000,
    skills: [
      "Quality inspection",
      "MS Excel",
      "Basic English",
      "Documentation",
      "Attention to detail",
      "Batch testing",
    ],
    badges: ["mock"],
    unlocked: true,
  },
  {
    id: "c2",
    name: "A. Kulkarni",
    exactScore: 812,
    location: "Pune · Hinjewadi",
    experienceYears: 4,
    salaryMin: 20000,
    salaryMax: 24000,
    skills: [
      "Team supervision",
      "Safety compliance",
      "Shift planning",
      "Basic English",
      "Inventory mgmt",
      "MS Excel",
    ],
    badges: ["mock", "addons"],
  },
  {
    id: "c3",
    name: "R. Patil",
    exactScore: 914,
    location: "Nashik",
    experienceYears: 6,
    salaryMin: 22000,
    salaryMax: 28000,
    skills: [
      "Quality inspection",
      "Forklift certified",
      "Inventory mgmt",
      "Team supervision",
      "Safety compliance",
      "Documentation",
    ],
    badges: ["attribute"],
  },
  {
    id: "c4",
    name: "M. Shaikh",
    exactScore: 731,
    location: "Aurangabad",
    experienceYears: 1,
    salaryMin: 12000,
    salaryMax: 15000,
    skills: ["Packaging", "Basic English"],
    badges: [],
  },
  {
    id: "c5",
    name: "P. Joshi",
    exactScore: 768,
    location: "Pune · Bhosari",
    experienceYears: 3,
    salaryMin: 16000,
    salaryMax: 21000,
    skills: ["Warehouse ops", "Inventory mgmt", "Basic English"],
    badges: ["addons"],
  },
  {
    id: "c6",
    name: "N. More",
    exactScore: 856,
    location: "Pune · Chakan",
    experienceYears: 7,
    salaryMin: 24000,
    salaryMax: 30000,
    skills: ["Forklift certified", "Safety compliance", "Team supervision"],
    badges: ["mock", "attribute"],
  },
];

export const BAND_DEFS: { key: CandidateBand; label: string; min: number; max: number }[] = [
  { key: "building", label: "Building · 680 to 749", min: 680, max: 749 },
  { key: "strong", label: "Strong · 750 to 849", min: 750, max: 849 },
  { key: "exceptional", label: "Exceptional · 850 to 999", min: 850, max: 999 },
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
  { key: "0-2", label: "0–2 yrs" },
  { key: "3-5", label: "3–5 yrs" },
  { key: "6+", label: "6+ yrs" },
];

export const ADDONS = [
  { key: "mock", label: "Mock interview completed" },
  { key: "attribute", label: "Attribute check completed" },
];

export function candidateBand(score: number): CandidateBand {
  if (score >= 850) return "exceptional";
  if (score >= 750) return "strong";
  return "building";
}

export function bandMeta(score: number) {
  const band = candidateBand(score);
  if (band === "exceptional") {
    return { label: "Exceptional", className: "bg-[#1f4e8c] text-white" };
  }
  if (band === "strong") {
    return { label: "Strong", className: "bg-[#147a4f] text-white" };
  }
  return { label: "Building", className: "bg-[#626b78] text-white" };
}

export function maskName(name: string) {
  const parts = name.split(" ");
  return parts
    .map((part, index) => {
      if (index === 0) return `${part[0]}.`;
      return `${part[0]}${"•".repeat(Math.max(3, part.length - 1))}`;
    })
    .join(" ");
}
