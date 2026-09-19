import type { RootState } from "@/store";

export const selectAdminSettings = (
  state: RootState,
) => state.admin.settings;

export const selectSettingsTab = (
  state: RootState,
) => state.admin.settings.tab;

export const selectKybMode = (
  state: RootState,
) => state.admin.settings.kybMode;

export const selectAutomaticChecks = (
  state: RootState,
) => state.admin.settings.autoChecks;

export const selectGstinCheck = (
  state: RootState,
) =>
  state.admin.settings.autoChecks.gstin;

export const selectPanCheck = (
  state: RootState,
) =>
  state.admin.settings.autoChecks.pan;

export const selectBankCheck = (
  state: RootState,
) =>
  state.admin.settings.autoChecks.bank;

export const selectAddressCheck = (
  state: RootState,
) =>
  state.admin.settings.autoChecks.address;