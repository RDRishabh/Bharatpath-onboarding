import type { EmployerDashboardData } from "../types";

const dashboardData: EmployerDashboardData = {
  stats: {
    activeJobs: 7,
    totalApplicants: 7,
    candidatesUnlocked: 1,
    creditBalance: 8,
  },

  topJobs: [
    {
      id: "j9",
      title: "Assembly Line Worker",
      applicants: 41,
    },
    {
      id: "j4",
      title: "Packaging Operator",
      applicants: 34,
    },
    {
      id: "j6",
      title: "Machine Operator",
      applicants: 27,
    },
  ],

  recentActivity: [
    {
      id: "activity-1",
      text: "You unlocked Candidate · C1 for Lab Analyst Trainee",
      time: "2h ago",
      type: "link",
    },
    {
      id: "activity-2",
      text: "Candidate · C6 applied to Quality Control Trainee",
      time: "5h ago",
      type: "link",
    },
    {
      id: "activity-3",
      text: "Candidate · C3 moved to Hired on Lab Analyst Trainee",
      time: "1d ago",
      type: "hire",
    },
    {
      id: "activity-4",
      text: "Business verification submitted for review",
      time: "2d ago",
      type: "upload",
    },
    {
      id: "activity-5",
      text: "You posted Quality Control Trainee",
      time: "3d ago",
      type: "upload",
    },
    {
      id: "activity-6",
      text: "Candidate · C4 moved to Interview on Quality Control Trainee",
      time: "3d ago",
      type: "link",
    },
    {
      id: "activity-7",
      text: "You purchased a 50 credit pack",
      time: "5d ago",
      type: "invoice",
    },
    {
      id: "activity-8",
      text: "Candidate · C2 applied to Lab Analyst Trainee",
      time: "6d ago",
      type: "link",
    },
  ],
};

export async function getEmployerDashboard(): Promise<EmployerDashboardData> {
  return dashboardData;
}