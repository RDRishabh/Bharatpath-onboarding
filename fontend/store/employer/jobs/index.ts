export {
  default as employerJobsReducer,

  setJobsSearch,
  setJobsStatusFilter,
  setJobsCurrentPage,
} from "./jobs.slice";
export type {
  JobsStatusFilter,
  EmployerJobsState,
} from "./jobs.slice";

export {
  selectJobsSearch,
  selectJobsStatusFilter,
  selectJobsCurrentPage,
} from "./jobs.selectors";

export {
  employerJobsApi,
  useGetEmployerJobsQuery,
  useGetEmployerJobQuery,
} from "./jobs.api";
