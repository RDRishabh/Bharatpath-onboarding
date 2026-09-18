import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  AdminUsersState,
  UserRow,
  UserSegment,
} from "@/features/admin/users/types";

const initialState: AdminUsersState = {
  segment: "candidates",

  search: "",

  selectedId: null,

  candidates: [],

  employers: [],

  institutions: [],
};

const adminUsersSlice = createSlice({
  name: "adminUsers",

  initialState,

  reducers: {
    setUserSearch(
      state,
      action: PayloadAction<string>,
    ) {
      state.search = action.payload;
    },

    setUserSegment(
      state,
      action: PayloadAction<UserSegment>,
    ) {
      state.segment = action.payload;
      state.selectedId = null;
    },

    openUser(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },

    closeUser(state) {
      state.selectedId = null;
    },

    setCandidates(
      state,
      action: PayloadAction<UserRow[]>,
    ) {
      state.candidates = action.payload;
    },

    setEmployers(
      state,
      action: PayloadAction<UserRow[]>,
    ) {
      state.employers = action.payload;
    },

    setInstitutions(
      state,
      action: PayloadAction<UserRow[]>,
    ) {
      state.institutions = action.payload;
    },
  },
});

export const {
  setUserSearch,
  setUserSegment,
  openUser,
  closeUser,
  setCandidates,
  setEmployers,
  setInstitutions,
} = adminUsersSlice.actions;

export default adminUsersSlice.reducer;