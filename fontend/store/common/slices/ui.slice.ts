import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: "ui",

  initialState,

  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed =
        !state.sidebarCollapsed;
    },

    setSidebarCollapsed(
      state,
      action: PayloadAction<boolean>,
    ) {
      state.sidebarCollapsed =
        action.payload;
    },

    setMobileMenuOpen(
      state,
      action: PayloadAction<boolean>,
    ) {
      state.mobileMenuOpen =
        action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setMobileMenuOpen,
} = uiSlice.actions;

export default uiSlice.reducer;