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

  candidates: [
    {
      id: "candidate-001",
      name: "Aarav Shah",
      initials: "AS",
      identifier: "CND-1001",
      meta: "Mumbai · Engineering",
      state: "Active",
      joined: "12 Aug 2026",
    },
    {
      id: "candidate-002",
      name: "Priya Mehta",
      initials: "PM",
      identifier: "CND-1002",
      meta: "Pune · Computer Science",
      state: "Active",
      joined: "11 Aug 2026",
    },
    {
      id: "candidate-003",
      name: "Rohan Patel",
      initials: "RP",
      identifier: "CND-1003",
      meta: "Ahmedabad · Mechanical",
      state: "Pending",
      joined: "10 Aug 2026",
    },
    {
      id: "candidate-004",
      name: "Ananya Joshi",
      initials: "AJ",
      identifier: "CND-1004",
      meta: "Nashik · Information Technology",
      state: "Active",
      joined: "09 Aug 2026",
    },
    {
      id: "candidate-005",
      name: "Karan Desai",
      initials: "KD",
      identifier: "CND-1005",
      meta: "Mumbai · Electronics",
      state: "Suspended",
      joined: "08 Aug 2026",
    },
  ],

  employers: [
    {
      id: "employer-001",
      name: "Tata Technologies",
      initials: "TT",
      identifier: "27AABCT1234A1Z5",
      meta: "Mumbai · Automotive",
      state: "Active",
      joined: "12 Aug 2026",
    },
    {
      id: "employer-002",
      name: "Reliance Industries",
      initials: "RI",
      identifier: "27AABCR5678B1Z3",
      meta: "Mumbai · Conglomerate",
      state: "Active",
      joined: "10 Aug 2026",
    },
    {
      id: "employer-003",
      name: "Apex Engineering",
      initials: "AE",
      identifier: "27AACCA1234C1Z8",
      meta: "Pune · Engineering",
      state: "Pending",
      joined: "08 Aug 2026",
    },
    {
      id: "employer-004",
      name: "BluePeak Systems",
      initials: "BS",
      identifier: "27AABCB9876D1Z2",
      meta: "Bengaluru · Technology",
      state: "Active",
      joined: "06 Aug 2026",
    },
  ],

  institutions: [
    {
      id: "institution-001",
      name: "Mumbai University",
      initials: "MU",
      identifier: "INST-2001",
      meta: "Mumbai · University",
      state: "Active",
      joined: "12 Aug 2026",
    },
    {
      id: "institution-002",
      name: "Pune Institute of Technology",
      initials: "PI",
      identifier: "INST-2002",
      meta: "Pune · Engineering",
      state: "Active",
      joined: "10 Aug 2026",
    },
    {
      id: "institution-003",
      name: "Nashik College",
      initials: "NC",
      identifier: "INST-2003",
      meta: "Nashik · Higher Education",
      state: "Pending",
      joined: "08 Aug 2026",
    },
    {
      id: "institution-004",
      name: "Western India University",
      initials: "WI",
      identifier: "INST-2004",
      meta: "Mumbai · University",
      state: "Active",
      joined: "05 Aug 2026",
    },
  ],
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
  setCandidates,
  setEmployers,
  setInstitutions,
} = adminUsersSlice.actions;

export default adminUsersSlice.reducer;