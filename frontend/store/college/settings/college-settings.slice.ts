import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
  CollegeProfile,
  CollegeSettingsState,
  CollegeUser,
  SettingsTab,
} from "@/features/college/settings/types";

const initialState: CollegeSettingsState = {
  activeTab: "profile",

  profile: {
    legalInstitutionName: "Sinhgad Technical Education Society",
    aicteCode: "1-4258963",
    city: "Pune",
    verified: true,
    verifiedOn: "12 Aug 2026",
  },

  users: [
    {
      id: "user-1",
      initials: "SK",
      name: "Dr. S. Kulkarni",
      email: "s.kulkarni@svit.edu.in",
      role: "Owner",
    },
    {
      id: "user-2",
      initials: "AD",
      name: "A. Deshpande",
      email: "a.deshpande@svit.edu.in",
      role: "Placement lead",
    },
    {
      id: "user-3",
      initials: "RM",
      name: "R. Mane",
      email: "r.mane@svit.edu.in",
      role: "Viewer",
    },
  ],

  seats: {
    used: 248,
    total: 300,
    status: "Active",
  },

  invoices: [
    {
      id: "BP-INV-2026-114",
      date: "01 Sep 2026",
      amount: 180000,
      status: "Paid",
    },
    {
      id: "BP-INV-2026-092",
      date: "01 Jun 2026",
      amount: 180000,
      status: "Paid",
    },
    {
      id: "BP-INV-2026-061",
      date: "01 Mar 2026",
      amount: 90000,
      status: "Paid",
    },
  ],

  isSavingProfile: false,
  isInvitingUser: false,
  isRequestingSeats: false,
  error: null,
};

const collegeSettingsSlice = createSlice({
  name: "collegeSettings",
  initialState,

  reducers: {
    setActiveTab: (
      state,
      action: PayloadAction<SettingsTab>,
    ) => {
      state.activeTab = action.payload;
    },

    updateProfileField: (
      state,
      action: PayloadAction<{
        field: keyof CollegeProfile;
        value: string | boolean;
      }>,
    ) => {
      const { field, value } = action.payload;

      state.profile[field] = value as never;
    },

    setProfile: (
      state,
      action: PayloadAction<CollegeProfile>,
    ) => {
      state.profile = action.payload;
    },

    setSavingProfile: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isSavingProfile = action.payload;
    },

    addUser: (
      state,
      action: PayloadAction<CollegeUser>,
    ) => {
      state.users.push(action.payload);
    },

    removeUser: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.users = state.users.filter(
        (user) => user.id !== action.payload,
      );
    },

    setInvitingUser: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isInvitingUser = action.payload;
    },

    setRequestingSeats: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isRequestingSeats = action.payload;
    },

    clearSettingsError: (state) => {
      state.error = null;
    },

    setSettingsError: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.error = action.payload;
    },
  },
});

export const {
  setActiveTab,
  updateProfileField,
  setProfile,
  setSavingProfile,
  addUser,
  removeUser,
  setInvitingUser,
  setRequestingSeats,
  clearSettingsError,
  setSettingsError,
} = collegeSettingsSlice.actions;

export default collegeSettingsSlice.reducer;