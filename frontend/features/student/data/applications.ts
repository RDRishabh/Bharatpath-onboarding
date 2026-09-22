import type { JobApplication } from "../types";

/*
 * ==========================================================================
 * MOCK — the application board. Seeds a spread of stages so the board shows a
 * mix of states; applying to a job from the feed adds a fresh SUBMITTED row.
 * ==========================================================================
 */

export const jobApplications: JobApplication[] = [
  {
    id: "app-aurum-quality",
    jobId: "job-aurum-quality",
    title: "Quality Trainee",
    company: "Aurum Labs",
    monogram: "AL",
    appliedOn: "12 Jul",
    status: "INTERVIEW",
    stageLabel: "Interview scheduled",
    stageIndex: 4,
    nextStep: "Interview scheduled",
    interview: {
      when: "Tomorrow, 11:00 am",
      mode: "Video call, about 30 minutes",
      withWhom: "Meera Kulkarni (Lab Head)",
    },
    timeline: [
      { label: "Applied", reached: true },
      { label: "Profile viewed", reached: true },
      { label: "Shortlisted", reached: true },
      { label: "Interview", reached: true },
      { label: "Decision", reached: false },
    ],
  },
  {
    id: "app-sterling-lab",
    jobId: "job-sterling-lab",
    title: "Lab Analyst Trainee",
    company: "Sterling Diagnostics",
    monogram: "SD",
    appliedOn: "10 Jul",
    status: "SHORTLISTED",
    stageLabel: "Shortlisted",
    stageIndex: 3,
    nextStep: "Waiting on the employer",
    timeline: [
      { label: "Applied", reached: true },
      { label: "Profile viewed", reached: true },
      { label: "Shortlisted", reached: true },
      { label: "Interview", reached: false },
      { label: "Decision", reached: false },
    ],
  },
  {
    id: "app-prisma-microbio",
    jobId: "job-prisma-microbio",
    title: "Microbiology Assistant",
    company: "Prisma Health",
    monogram: "PH",
    appliedOn: "6 Jul",
    status: "SUBMITTED",
    stageLabel: "Sent",
    stageIndex: 1,
    nextStep: "Employers usually open in about 4 days",
    timeline: [
      { label: "Applied", reached: true },
      { label: "Profile viewed", reached: false },
      { label: "Shortlisted", reached: false },
      { label: "Interview", reached: false },
      { label: "Decision", reached: false },
    ],
  },
];
