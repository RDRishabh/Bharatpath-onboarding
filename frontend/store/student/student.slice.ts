import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type {
  JobApplication,
  StudentNotification,
} from "@/features/student/types";
import {
  jobApplications as seedApplications,
  studentNotifications as seedNotifications,
  findJob,
} from "@/features/student/data";

/*
 * ==========================================================================
 * STUDENT PORTAL — REDUX SLICE
 *
 * All state that would come from backend APIs later lives here, seeded from
 * static mock data. Every interaction (save a job, apply, withdraw, mark a
 * notification read, filter, search) is a local reducer — no network calls.
 * ==========================================================================
 */

export type BoardFilter =
  | "all"
  | "active"
  | "interview"
  | "closed";

export interface StudentState {
  /** Jobs the candidate has saved (heart toggled). */
  savedJobIds: string[];

  /** Live application board, seeded from mock and grown by "Apply". */
  applications: JobApplication[];

  /** Notifications with per-item read state. */
  notifications: StudentNotification[];

  /** Job feed controls. */
  jobSearch: string;
  jobQualifiedOnly: boolean;
  jobCategory: string | null;

  /** Application board tab. */
  boardFilter: BoardFilter;

  /** Share card: reveal the exact number, or just the band. */
  shareExact: boolean;

  /** Notification permission (the onboarding "allow" toggle). */
  notificationsEnabled: boolean;
}

const initialState: StudentState = {
  savedJobIds: [],
  applications: seedApplications,
  notifications: seedNotifications,
  jobSearch: "",
  jobQualifiedOnly: true,
  jobCategory: null,
  boardFilter: "all",
  shareExact: false,
  notificationsEnabled: true,
};

const studentSlice = createSlice({
  name: "student",

  initialState,

  reducers: {
    /* ---- Saved jobs ---- */
    toggleSavedJob: (
      state,
      action: PayloadAction<string>,
    ) => {
      const id = action.payload;
      state.savedJobIds = state.savedJobIds.includes(id)
        ? state.savedJobIds.filter((saved) => saved !== id)
        : [...state.savedJobIds, id];
    },

    /* ---- Applications ---- */
    applyToJob: (
      state,
      action: PayloadAction<string>,
    ) => {
      const jobId = action.payload;
      if (state.applications.some((app) => app.jobId === jobId)) {
        return;
      }

      const job = findJob(jobId);
      if (!job) {
        return;
      }

      state.applications.unshift({
        id: `app-${jobId}`,
        jobId,
        title: job.title,
        company: job.company,
        monogram: job.monogram,
        appliedOn: "Just now",
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
      });
    },

    withdrawApplication: (
      state,
      action: PayloadAction<string>,
    ) => {
      const app = state.applications.find(
        (item) => item.id === action.payload,
      );
      if (app) {
        app.status = "WITHDRAWN";
        app.stageLabel = "Withdrawn";
        app.nextStep = undefined;
      }
    },

    /* ---- Notifications ---- */
    markNotificationRead: (
      state,
      action: PayloadAction<string>,
    ) => {
      const notif = state.notifications.find(
        (item) => item.id === action.payload,
      );
      if (notif) {
        notif.read = true;
      }
    },

    markAllNotificationsRead: (state) => {
      state.notifications.forEach((notif) => {
        notif.read = true;
      });
    },

    setNotificationsEnabled: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.notificationsEnabled = action.payload;
    },

    /* ---- Job feed filters ---- */
    setJobSearch: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.jobSearch = action.payload;
    },

    toggleQualifiedOnly: (state) => {
      state.jobQualifiedOnly = !state.jobQualifiedOnly;
    },

    setJobCategory: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.jobCategory =
        state.jobCategory === action.payload ? null : action.payload;
    },

    /* ---- Application board ---- */
    setBoardFilter: (
      state,
      action: PayloadAction<BoardFilter>,
    ) => {
      state.boardFilter = action.payload;
    },

    /* ---- Share card ---- */
    toggleShareExact: (state) => {
      state.shareExact = !state.shareExact;
    },
  },
});

export const {
  toggleSavedJob,
  applyToJob,
  withdrawApplication,
  markNotificationRead,
  markAllNotificationsRead,
  setNotificationsEnabled,
  setJobSearch,
  toggleQualifiedOnly,
  setJobCategory,
  setBoardFilter,
  toggleShareExact,
} = studentSlice.actions;

export default studentSlice.reducer;
