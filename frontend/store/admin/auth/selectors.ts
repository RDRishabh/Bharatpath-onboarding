import type { RootState } from "@/store";
export const selectAdminAuth = (state: RootState) => state.admin.auth;
