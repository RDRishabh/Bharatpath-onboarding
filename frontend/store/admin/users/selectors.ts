import type { RootState } from "@/store";

export const selectAdminUsers = (
  state: RootState,
) => state.admin.users;

export const selectUserSegment = (
  state: RootState,
) => state.admin.users.segment;

export const selectUserSearch = (
  state: RootState,
) => state.admin.users.search;

export const selectCandidates = (
  state: RootState,
) => state.admin.users.candidates;

export const selectEmployers = (
  state: RootState,
) => state.admin.users.employers;

export const selectInstitutions = (
  state: RootState,
) => state.admin.users.institutions;

export const selectActiveUsers = (
  state: RootState,
) => {
  const users = state.admin.users;

  switch (users.segment) {
    case "employers":
      return users.employers;

    case "institutions":
      return users.institutions;

    case "candidates":
    default:
      return users.candidates;
  }
};