import type { RootState } from "@/store";

export const selectAdminQueue = (
  state: RootState,
) => state.admin.queue;

export const selectQueueTab = (
  state: RootState,
) => state.admin.queue.tab;

export const selectOpenReviewId = (
  state: RootState,
) => state.admin.queue.openReviewId;

export const selectKybItems = (
  state: RootState,
) => state.admin.queue.kybItems;

export const selectIntegrityItems = (
  state: RootState,
) => state.admin.queue.integrityItems;

export const selectQueueItems = (
  state: RootState,
) => {
  if (state.admin.queue.tab === "integrity") {
    return state.admin.queue.integrityItems;
  }

  return state.admin.queue.kybItems;
};

export const selectKybCount = (
  state: RootState,
) => state.admin.queue.kybItems.length;

export const selectIntegrityCount = (
  state: RootState,
) => state.admin.queue.integrityItems.length;