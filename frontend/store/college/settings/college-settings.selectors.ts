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

export const selectInvoices = (
  state: RootState,
) => state.collegeSettings.invoices;

export const selectIsSavingProfile = (
  state: RootState,
) => state.collegeSettings.isSavingProfile;

export const selectIsInvitingUser = (
  state: RootState,
) => state.collegeSettings.isInvitingUser;

export const selectIsRequestingSeats = (
  state: RootState,
) => state.collegeSettings.isRequestingSeats;