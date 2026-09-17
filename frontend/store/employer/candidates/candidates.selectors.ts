import type { RootState } from "@/store";

export const selectEmployerCandidateFilters = (state: RootState) =>
	state.employerCandidates.filters;

export const selectEmployerCandidateSearch = (state: RootState) =>
	state.employerCandidates.filters.search;

export const selectEmployerCandidatePage = (state: RootState) =>
	state.employerCandidates.currentPage;

export const selectEmployerCandidateCursor = (state: RootState) =>
	state.employerCandidates.cursorHistory[state.employerCandidates.currentPage - 1] ?? "";
