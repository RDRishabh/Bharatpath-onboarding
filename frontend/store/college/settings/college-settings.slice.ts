import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type {
  CollegeSeats,
  CollegeTeamMember,
} from "@/store/college/types";

import type {
  CollegeProfile,
  CollegeSettingsState,
  CollegeUser,
  SettingsTab,
  UserRole,
} from "@/features/college/settings/types";

function initialsFor(email: string): string {
  const parts = email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function displayNameFor(email: string): string {
  const parts = email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "Team member";
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ROLE_LABELS: Record<CollegeTeamMember["role"], UserRole> = {
  COLLEGE_ADMIN: "Admin",
  COLLEGE_STAFF: "Staff",
};

const initialState: CollegeSettingsState = {
  activeTab: "profile",
  profile: null,
  users: [],
  seats: null,
  isSavingProfile: false,
  isInvitingUser: false,
  isRemovingUser: false,
  saveProfileError: null,
  inviteUserError: null,
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

    replaceProfile: (
      state,
      action: PayloadAction<CollegeProfile>,
    ) => {
      state.profile = action.payload;
    },

    updateProfileField: (
      state,
      action: PayloadAction<{
        field: "name" | "institutionType";
        value: string;
      }>,
    ) => {
      if (!state.profile) {
        return;
      }

      if (action.payload.field === "name") {
        state.profile.name = action.payload.value;
      } else {
        state.profile.institutionType =
          action.payload.value || null;
      }
    },

    replaceUsers: (
      state,
      action: PayloadAction<CollegeTeamMember[]>,
    ) => {
      state.users = action.payload.map((member) => ({
        ...member,
        initials: initialsFor(member.email),
        displayName: displayNameFor(member.email),
        roleLabel: ROLE_LABELS[member.role],
      }));
    },

    replaceSeats: (
      state,
      action: PayloadAction<CollegeSeats>,
    ) => {
      state.seats = action.payload;
    },

    setSavingProfile: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isSavingProfile = action.payload;
    },

    setInvitingUser: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isInvitingUser = action.payload;
    },

    setRemovingUser: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isRemovingUser = action.payload;
    },

    setSaveProfileError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.saveProfileError = action.payload;
    },

    setInviteUserError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.inviteUserError = action.payload;
    },

    clearSettingsErrors: (state) => {
      state.saveProfileError = null;
      state.inviteUserError = null;
    },
  },
});

export const {
  setActiveTab,
  replaceProfile,
  updateProfileField,
  replaceUsers,
  replaceSeats,
  setSavingProfile,
  setInvitingUser,
  setRemovingUser,
  setSaveProfileError,
  setInviteUserError,
  clearSettingsErrors,
} = collegeSettingsSlice.actions;

export default collegeSettingsSlice.reducer;