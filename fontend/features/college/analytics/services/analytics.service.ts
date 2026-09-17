import { CollegeAnalytics } from "../types";

/*
 * Temporary static data.
 *
 * The backend API is not available yet, so analytics
 * are served from this mock until it is.
 */
const MOCK_ANALYTICS: CollegeAnalytics = {
  seats: {
    used: 248,
    total: 300,
  },

  metrics: [
    {
      id: "average-score",
      value: 726,
      label: "Average cohort score",
      delta: 18,
      deltaLabel: "vs last cohort",
    },
    {
      id: "applications",
      value: 412,
      label: "Applications sent",
      delta: 96,
      deltaLabel: "this month",
    },
    {
      id: "interviews",
      value: 86,
      label: "Interviews scheduled",
      delta: 12,
      deltaLabel: "this month",
    },
    {
      id: "hired",
      value: 37,
      label: "Hired via platform",
      delta: -4,
      deltaLabel: "vs last cohort",
    },
  ],

  courseScores: [
    { label: "Chem", score: 748 },
    { label: "Mech", score: 731 },
    { label: "Elec", score: 712 },
    { label: "Prod", score: 704 },
    { label: "Phys", score: 688 },
  ],

  skillGaps: [
    { label: "Documentation accuracy", percentageBelowMedian: 42 },
    { label: "Basic English fluency", percentageBelowMedian: 36 },
    { label: "Safety compliance", percentageBelowMedian: 24 },
    { label: "MS Excel", percentageBelowMedian: 18 },
  ],

  outcomes: [
    {
      id: "out-1",
      role: "Lab Analyst Trainee",
      employer: "Sterling Diagnostics",
      applied: "18 Aug",
      stage: "Hired",
      students: 9,
    },
    {
      id: "out-2",
      role: "Process Operator",
      employer: "Aarti Industries",
      applied: "12 Aug",
      stage: "Interview",
      students: 14,
    },
    {
      id: "out-3",
      role: "QC Associate",
      employer: "Cipla",
      applied: "4 Aug",
      stage: "Shortlisted",
      students: 21,
    },
    {
      id: "out-4",
      role: "Maintenance Technician",
      employer: "Thermax",
      applied: "29 Jul",
      stage: "Applied",
      students: 33,
    },
    {
      id: "out-5",
      role: "Safety Officer Trainee",
      employer: "Larsen & Toubro",
      applied: "22 Jul",
      stage: "Interview",
      students: 11,
    },
    {
      id: "out-6",
      role: "Production Intern",
      employer: "Tata Chemicals",
      applied: "15 Jul",
      stage: "Shortlisted",
      students: 18,
    },
    {
      id: "out-7",
      role: "Documentation Associate",
      employer: "Dr Reddy's",
      applied: "8 Jul",
      stage: "Hired",
      students: 6,
    },
  ],
};

export const analyticsService = {
  async getAnalytics(
    cohort = "2025-26",
  ): Promise<CollegeAnalytics> {
    void cohort;

    return MOCK_ANALYTICS;
  },
};
