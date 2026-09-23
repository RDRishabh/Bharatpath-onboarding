import type { RootState } from "@/store";

import studentReducer from "./student.slice";

export { studentReducer };
export * from "./student.slice";

/*
 * ==========================================================================
 * SELECTORS
 * ==========================================================================
 */

export const selectSavedJobIds = (state: RootState) =>
  state.student.savedJobIds;

export const selectIsJobSaved =
  (jobId: string) => (state: RootState) =>
    state.student.savedJobIds.includes(jobId);

export const selectApplications = (state: RootState) =>
  state.student.applications;

export const selectHasApplied =
  (jobId: string) => (state: RootState) =>
    state.student.applications.some((app) => app.jobId === jobId);

export const selectJobSearch = (state: RootState) =>
  state.student.jobSearch;

export const selectJobQualifiedOnly = (state: RootState) =>
  state.student.jobQualifiedOnly;

export const selectJobCategory = (state: RootState) =>
  state.student.jobCategory;

export const selectBoardFilter = (state: RootState) =>
  state.student.boardFilter;

export const selectShareExact = (state: RootState) =>
  state.student.shareExact;
