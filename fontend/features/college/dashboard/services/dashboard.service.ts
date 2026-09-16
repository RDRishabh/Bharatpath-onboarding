import { CollegeDashboard } from "../types";

/*
 * Temporary static data.
 *
 * The backend API is not available yet, so the
 * dashboard is served from this mock until it is.
 */
const MOCK_DASHBOARD: CollegeDashboard = {
  stats: {
    studentsLinked: 482,
    consentShared: 356,
    averageScore: 71,
    hiredViaPlatform: 38,
  },

  scoreBands: [
    { label: "Exceptional", range: "85-100", count: 64 },
    { label: "Strong", range: "60-84", count: 218 },
    { label: "Building", range: "0-59", count: 200 },
  ],

  referralCode: "BPCOLLEGE482",

  seats: {
    used: 300,
    total: 450,
  },

  recentActivity: [
    {
      id: "act-1",
      text: "42 students linked their profiles",
      time: "2 hours ago",
      type: "link",
    },
    {
      id: "act-2",
      text: "Resume bulk upload completed for CSE 2026",
      time: "Yesterday",
      type: "upload",
    },
    {
      id: "act-3",
      text: "3 students hired via platform",
      time: "3 days ago",
      type: "hire",
    },
    {
      id: "act-4",
      text: "Invoice #INV-0231 generated",
      time: "1 week ago",
      type: "invoice",
    },
  ],

  paymentStatus: "active",
};

export const dashboardService = {
  async getDashboard(): Promise<CollegeDashboard> {
    return MOCK_DASHBOARD;
  },
};
