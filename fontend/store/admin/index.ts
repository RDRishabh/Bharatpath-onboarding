import { combineReducers } from "@reduxjs/toolkit";

import auth from "./auth/slice";
import dashboard from "./dashboard/slice";
import queue from "./queue/slice";
import users from "./users/slice";
import disputes from "./disputes/slice";
import settings from "./settings/slice";

export const adminReducer = combineReducers({
  auth,
  dashboard,
  queue,
  users,
  disputes,
  settings,
});

export * from "./auth/slice";
export * from "./auth/selectors";
export * from "./dashboard/slice";
export * from "./dashboard/selectors";
export * from "./queue/slice";
export * from "./queue/selectors";
export * from "./users/slice";
export * from "./users/selectors";
export * from "./disputes/slice";
export * from "./disputes/selectors";
export * from "./settings/slice";
export * from "./settings/selectors";

export {
  toggleSidebar,
  setSidebarCollapsed,
  setMobileMenuOpen,
} from "@/store/common/slices/ui.slice";

export {
  selectSidebarCollapsed as selectAdminSidebarCollapsed,
  selectMobileMenuOpen as selectAdminMobileMenuOpen,
} from "@/store/common/selectors/ui.selectors";
