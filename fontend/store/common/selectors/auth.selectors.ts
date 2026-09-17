import { RootState } from "../../index";

export const selectCurrentUser = (
  state: RootState,
) => state.auth.user;

export const selectIsAuthenticated = (
  state: RootState,
) => state.auth.isAuthenticated;

export const selectUserRole = (
  state: RootState,
) => state.auth.user?.role ?? null;