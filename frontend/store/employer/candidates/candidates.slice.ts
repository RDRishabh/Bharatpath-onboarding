import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { CandidateBadge, CandidateBand, CandidateFiltersState } from "@/features/employer/candidates/types";

export interface EmployerCandidatesState {
	filters: CandidateFiltersState;
	currentPage: number;
	cursorHistory: string[];
}

const initialState: EmployerCandidatesState = {
	filters: {
		search: "",
		bands: [],
		skills: [],
		locations: [],
		experiences: [],
		addons: [],
	},
	currentPage: 1,
	cursorHistory: [""],
};

const candidatesSlice = createSlice({
	name: "employerCandidates",
	initialState,
	reducers: {
		setCandidateFilters: (state, action: PayloadAction<CandidateFiltersState>) => {
			state.filters = action.payload;
			state.currentPage = 1;
			state.cursorHistory = [""];
		},
		toggleCandidateBand: (state, action: PayloadAction<CandidateBand>) => {
			const bands = state.filters.bands;
			state.filters.bands = bands.includes(action.payload)
				? bands.filter((band) => band !== action.payload)
				: [...bands, action.payload];
			state.currentPage = 1;
			state.cursorHistory = [""];
		},
		setCandidateSearch: (state, action: PayloadAction<string>) => {
			state.filters.search = action.payload;
			state.currentPage = 1;
			state.cursorHistory = [""];
		},
		toggleCandidateFilter: (
			state,
			action: PayloadAction<{ key: "skills" | "locations" | "experiences" | "addons"; value: string }>,
		) => {
			if (action.payload.key === "addons") {
				const value = action.payload.value as CandidateBadge;
				const values = state.filters.addons;
				state.filters.addons = values.includes(value)
					? values.filter((item) => item !== value)
					: [...values, value];
			} else {
				const key = action.payload.key;
				const values = state.filters[key];
				state.filters[key] = values.includes(action.payload.value)
					? values.filter((value) => value !== action.payload.value)
					: [...values, action.payload.value];
			}
			state.currentPage = 1;
			state.cursorHistory = [""];
		},
		goToNextCandidatePage: (state, action: PayloadAction<string>) => {
			state.cursorHistory.push(action.payload);
			state.currentPage += 1;
		},
		goToPreviousCandidatePage: (state) => {
			if (state.currentPage > 1) {
				state.cursorHistory.pop();
				state.currentPage -= 1;
			}
		},
	},
});

export const {
	setCandidateFilters,
	toggleCandidateBand,
	setCandidateSearch,
	toggleCandidateFilter,
	goToNextCandidatePage,
	goToPreviousCandidatePage,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;
