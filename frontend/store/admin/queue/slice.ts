import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  QueueItem,
  QueueTab,
} from "@/features/admin/queue/types";

export interface AdminQueueState {
  tab: QueueTab;

  openReviewId: string | null;

  kybItems: QueueItem[];

  integrityItems: QueueItem[];
}

const initialState: AdminQueueState = {
  tab: "kyb",

  openReviewId: null,

  kybItems: [],

  integrityItems: [],
};

const adminQueueSlice = createSlice({
  name: "adminQueue",

  initialState,

  reducers: {
    setQueueTab(
      state,
      action: PayloadAction<QueueTab>,
    ) {
      state.tab = action.payload;
    },

    openReview(
      state,
      action: PayloadAction<string>,
    ) {
      state.openReviewId = action.payload;
    },

    closeReview(state) {
      state.openReviewId = null;
    },

    setKybItems(
      state,
      action: PayloadAction<QueueItem[]>,
    ) {
      state.kybItems = action.payload;
    },

    setIntegrityItems(
      state,
      action: PayloadAction<QueueItem[]>,
    ) {
      state.integrityItems = action.payload;
    },

    setQueueItems(
      state,
      action: PayloadAction<{
        kybItems: QueueItem[];
        integrityItems: QueueItem[];
      }>,
    ) {
      state.kybItems =
        action.payload.kybItems;

      state.integrityItems =
        action.payload.integrityItems;
    },
  },
});

export const {
  setQueueTab,
  openReview,
  closeReview,
  setKybItems,
  setIntegrityItems,
  setQueueItems,
} = adminQueueSlice.actions;

export default adminQueueSlice.reducer;