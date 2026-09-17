import { RootState } from "../../index";

export const selectSidebarCollapsed = (
  state: RootState,
) => state.ui.sidebarCollapsed;

export const selectMobileMenuOpen = (
  state: RootState,
) => state.ui.mobileMenuOpen;