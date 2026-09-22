import type { StudentScore, ImprovementFix } from "../types";

/*
 * ==========================================================================
 * MOCK — the resume score. The model reads, code scores: this is the shape the
 * score-reveal, breakdown and suggestion screens render. Five fixed categories.
 * ==========================================================================
 */

export const studentScore: StudentScore = {
  value: 706,
  max: 990,
  delta: 26,
  band: 1,
  bandCount: 4,
  bandLabel: "Starting",
  toNextBand: 28,
  nextBandLabel: "Building",
  categories: [
    {
      key: "education",
      label: "Education",
      value: 72,
      note: "Degree finished, marks above average for your field.",
      emphasis: "neutral",
    },
    {
      key: "skills",
      label: "Skills",
      value: 48,
      note: "3 skills listed. Lab roles in Pune usually ask for 6 or more.",
      emphasis: "strong",
      fix: { label: "Add the lab tools you used", points: 26 },
    },
    {
      key: "experience",
      label: "Experience",
      value: 15,
      note: "One internship. Normal for a fresher, and the category that grows fastest.",
      emphasis: "weak",
    },
    {
      key: "projects",
      label: "Projects",
      value: 55,
      note: "Two projects, neither with a result or a number attached.",
      emphasis: "neutral",
      fix: { label: "Put a number on a project", points: 20 },
    },
    {
      key: "presentation",
      label: "Presentation",
      value: 66,
      note: "Clear layout. Two spelling mistakes found.",
      emphasis: "neutral",
      fix: { label: "Correct two spellings", points: 12 },
    },
  ],
};

/** Ordered biggest-first, the three suggestions on the "Raise my score" screen. */
export const improvementFixes: ImprovementFix[] = [
  {
    id: "fix-skills",
    index: 1,
    category: "Skills",
    title: "Add the lab tools you have actually used",
    description:
      "Autoclave, spectrophotometer, LIMS entry. Employers hiring lab roles in Pune filter on exactly these.",
    points: 26,
    skills: ["Autoclave", "Spectrophotometer", "LIMS"],
    actionLabel: "Add these three skills",
  },
  {
    id: "fix-projects",
    index: 2,
    category: "Projects",
    title: "Put a number on your project",
    description:
      "\"Tested 40 water samples over 6 weeks\" counts for far more than \"water testing project\".",
    points: 20,
    actionLabel: "Edit this project",
  },
  {
    id: "fix-presentation",
    index: 3,
    category: "Presentation",
    title: "Correct two spellings",
    description: "\"MS-Ofice\" and \"Teem work\" are still flagged in your skills.",
    points: 12,
    actionLabel: "Fix both spellings",
  },
];

/** Sum of the three fixes, shown as "about +58 points". */
export const totalImprovementPoints = improvementFixes.reduce(
  (sum, fix) => sum + fix.points,
  0,
);
