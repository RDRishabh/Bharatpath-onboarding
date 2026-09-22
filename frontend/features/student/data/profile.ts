import type { StudentProfile, ProfileView } from "../types";

/*
 * ==========================================================================
 * MOCK — the signed-in candidate. Everything here is static demo data; the
 * API layer will replace this file later without touching the UI.
 * ==========================================================================
 */

export const studentProfile: StudentProfile = {
  fullName: "Priya Deshmukh",
  initials: "PD",
  greetingName: "Priya",
  email: "priya.deshmukh@example.in",
  phoneMasked: "+91 98765 4••••",
  location: "Kothrud, Pune",
  college: "Fergusson College, Pune",
  degree: "B.Sc.",
  branch: "Microbiology",
  graduationYear: "2026",
  language: "English",
  profileCompletion: 82,
  skills: [
    "Lab reporting",
    "Sample testing",
    "MS Office",
    "Autoclave",
    "Data entry",
  ],
  resumeFileName: "Priya_Deshmukh_Resume.pdf",
};

/** "Who has seen me" — the employer-unlock audit log. */
export const profileViews: ProfileView[] = [
  {
    id: "view-1",
    company: "Sterling Diagnostics",
    monogram: "SD",
    when: "Today, 9:20 am",
    action: "Opened your profile",
  },
  {
    id: "view-2",
    company: "Aurum Labs",
    monogram: "AL",
    when: "Yesterday",
    action: "Moved you to Interview",
  },
  {
    id: "view-3",
    company: "Novacare Foods",
    monogram: "NF",
    when: "3 days ago",
    action: "Opened your profile",
  },
];
