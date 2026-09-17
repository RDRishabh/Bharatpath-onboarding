import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  AutomaticCheckKey,
  KybMode,
  SettingsTab,
} from "@/features/admin/settings/types";

export interface AdminSettingsState {
  tab: SettingsTab;

  kybMode: KybMode;

  autoChecks: Record<
    AutomaticCheckKey,
    boolean
  >;
}

const initialState: AdminSettingsState = {
  tab: "approval",

  kybMode: "manual",

  autoChecks: {
    gstin: true,
    pan: true,
    bank: false,
    address: true,
  },
};

const adminSettingsSlice = createSlice({
  name: "adminSettings",

  initialState,

  reducers: {
    setSettingsTab(
      state,
      action: PayloadAction<SettingsTab>,
    ) {
      state.tab = action.payload;
    },

    setKybMode(
      state,
      action: PayloadAction<KybMode>,
    ) {
      state.kybMode = action.payload;
    },

    toggleCheck(
      state,
      action: PayloadAction<AutomaticCheckKey>,
    ) {
      const key = action.payload;

      state.autoChecks[key] =
        !state.autoChecks[key];
    },

    setAutomaticCheck(
      state,
      action: PayloadAction<{
        key: AutomaticCheckKey;
        enabled: boolean;
      }>,
    ) {
      state.autoChecks[action.payload.key] =
        action.payload.enabled;
    },

    resetSettings(state) {
      state.tab = initialState.tab;
      state.kybMode = initialState.kybMode;
      state.autoChecks = {
        ...initialState.autoChecks,
      };
    },
  },
});

export const {
  setSettingsTab,
  setKybMode,
  toggleCheck,
  setAutomaticCheck,
  resetSettings,
} = adminSettingsSlice.actions;

export default adminSettingsSlice.reducer;