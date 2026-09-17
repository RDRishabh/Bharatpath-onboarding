import { RootState } from "@/store";

export const selectCollegeSettings = (
  state: RootState,
) => state.collegeSettings;

export const selectSettingsTab = (
  state: RootState,
) => state.collegeSettings.activeTab;

export const selectCollegeProfile = (
  state: RootState,
) => state.collegeSettings.profile;

export const selectCollegeUsers = (
  state: RootState,
) => state.collegeSettings.users;

export const selectSeatInfo = (
  state: RootState,
) => state.collegeSettings.seats;

export const selectIsSavingProfile = (
  state: RootState,
) => state.collegeSettings.isSavingProfile;

export const selectIsInvitingUser = (
  state: RootState,
) => state.collegeSettings.isInvitingUser;

export const selectIsRemovingUser = (
  state: RootState,
) => state.collegeSettings.isRemovingUser;

export const selectSaveProfileError = (
  state: RootState,
) => state.collegeSettings.saveProfileError;

export const selectInviteUserError = (
  state: RootState,
) => state.collegeSettings.inviteUserError;