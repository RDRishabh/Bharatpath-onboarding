import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type {
  JobApplication,
} from "@/features/student/types";
import {
  jobApplications as seedApplications,
  findJob,
} from "@/features/student/data";

/*
 * ==========================================================================
 * STUDENT PORTAL — REDUX SLICE
 *
 * Local state for student interactions that have not yet moved to API-owned
 * state, including saved jobs, application display state and feed controls.
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

  /** Job feed controls. */
  jobSearch: string;
  jobQualifiedOnly: boolean;
  jobCategory: string | null;

  /** Application board tab. */
  boardFilter: BoardFilter;

  /** Share card: reveal the exact number, or just the band. */
  shareExact: boolean;

}

const initialState: StudentState = {
  savedJobIds: [],
  applications: seedApplications,
  jobSearch: "",
  jobQualifiedOnly: true,
  jobCategory: null,
  boardFilter: "all",
  shareExact: false,
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
  setJobSearch,
  toggleQualifiedOnly,
  setJobCategory,
  setBoardFilter,
  toggleShareExact,
} = studentSlice.actions;

export default studentSlice.reducer;
