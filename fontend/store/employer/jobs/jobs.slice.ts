import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type { JobStatus } from "@/features/employer/jobs/types";

export type JobsStatusFilter = "all" | JobStatus;

export interface EmployerJobsState {
  search: string;

  statusFilter: JobsStatusFilter;

  currentPage: number;
}

const initialState: EmployerJobsState = {
  search: "",

  statusFilter: "all",

  currentPage: 1,
};

const jobsSlice = createSlice({
  name: "employerJobs",

  initialState,

  reducers: {
    setJobsSearch: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.search = action.payload;
      state.currentPage = 1;
    },

    setJobsStatusFilter: (
      state,
      action: PayloadAction<JobsStatusFilter>,
    ) => {
      state.statusFilter = action.payload;
      state.currentPage = 1;
    },

    setJobsCurrentPage: (
      state,
      action: PayloadAction<number>,
    ) => {
      state.currentPage = action.payload;
    },
  },
});

export const {
  setJobsSearch,
  setJobsStatusFilter,
  setJobsCurrentPage,
} = jobsSlice.actions;

export default jobsSlice.reducer;
