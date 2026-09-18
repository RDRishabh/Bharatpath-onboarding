import type { RootState } from "@/store";

export const selectAdminFeedback = (state: RootState) => state.admin.feedback.message;