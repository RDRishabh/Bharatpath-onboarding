import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type {
  CollegeSeats,
  CollegeStudentDetail,
  ReferralCode,
  RosterImport,
  RosterRow,
  VisibleStudent,
} from "@/store/college/types";

export interface CollegeStudentsState {
  seats: CollegeSeats | null;
  students: VisibleStudent[];
  studentDetail: CollegeStudentDetail | null;
  referralCodes: ReferralCode[];
  rosterImports: RosterImport[];
  activeRosterImport: RosterImport | null;
  activeRosterRows: RosterRow[] | null;
  isIssuingCode: boolean;
  isRevokingCode: boolean;
  isUploadingRoster: boolean;
  isCommittingRoster: boolean;
  isSendingInvitations: boolean;
  referralError: string | null;
  rosterError: string | null;
}

const initialState: CollegeStudentsState = {
  seats: null,
  students: [],
  studentDetail: null,
  referralCodes: [],
  rosterImports: [],
  activeRosterImport: null,
  activeRosterRows: null,
  isIssuingCode: false,
  isRevokingCode: false,
  isUploadingRoster: false,
  isCommittingRoster: false,
  isSendingInvitations: false,
  referralError: null,
  rosterError: null,
};

const collegeStudentsSlice = createSlice({
  name: "collegeStudents",
  initialState,

  reducers: {
    replaceSeats: (
      state,
      action: PayloadAction<CollegeSeats>,
    ) => {
      state.seats = action.payload;
    },

    replaceStudents: (
      state,
      action: PayloadAction<VisibleStudent[]>,
    ) => {
      state.students = action.payload;
    },

    setStudentDetail: (
      state,
      action: PayloadAction<CollegeStudentDetail | null>,
    ) => {
      state.studentDetail = action.payload;
    },

    replaceReferralCodes: (
      state,
      action: PayloadAction<ReferralCode[]>,
    ) => {
      state.referralCodes = action.payload;
    },

    replaceRosterImports: (
      state,
      action: PayloadAction<RosterImport[]>,
    ) => {
      state.rosterImports = action.payload;
    },

    setActiveRosterImport: (
      state,
      action: PayloadAction<RosterImport | null>,
    ) => {
      state.activeRosterImport = action.payload;
    },

    setActiveRosterRows: (
      state,
      action: PayloadAction<RosterRow[] | null>,
    ) => {
      state.activeRosterRows = action.payload;
    },

    clearRosterPreview: (state) => {
      state.activeRosterImport = null;
      state.activeRosterRows = null;
    },

    setIsIssuingCode: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isIssuingCode = action.payload;

      if (action.payload) {
        state.referralError = null;
      }
    },

    setIsRevokingCode: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isRevokingCode = action.payload;
    },

    setIsUploadingRoster: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isUploadingRoster = action.payload;

      if (action.payload) {
        state.rosterError = null;
      }
    },

    setIsCommittingRoster: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isCommittingRoster = action.payload;
    },

    setIsSendingInvitations: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isSendingInvitations = action.payload;
    },

    setReferralError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.referralError = action.payload;
    },

    setRosterError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.rosterError = action.payload;
    },

    clearStudentsErrors: (state) => {
      state.referralError = null;
      state.rosterError = null;
    },
  },
});

export const {
  replaceSeats,
  replaceStudents,
  setStudentDetail,
  replaceReferralCodes,
  replaceRosterImports,
  setActiveRosterImport,
  setActiveRosterRows,
  clearRosterPreview,
  setIsIssuingCode,
  setIsRevokingCode,
  setIsUploadingRoster,
  setIsCommittingRoster,
  setIsSendingInvitations,
  setReferralError,
  setRosterError,
  clearStudentsErrors,
} = collegeStudentsSlice.actions;

export default collegeStudentsSlice.reducer;