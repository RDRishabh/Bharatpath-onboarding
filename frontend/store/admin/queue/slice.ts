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

  kybItems: [
    {
      id: "kyb-001",
      name: "Sterling Diagnostics Pvt Ltd",
      initials: "SD",
      submitted: "Submitted 14h ago",
      secondary: "27ABCDE1234F1Z5",
      risk: "Medium",
      waiting: "14h",
      type: "KYB",
    },
    {
      id: "kyb-002",
      name: "Nashik Pharma Works",
      initials: "NP",
      submitted: "Submitted 11h ago",
      secondary: "27PQRST5678K2M1",
      risk: "Low",
      waiting: "11h",
      type: "KYB",
    },
    {
      id: "kyb-003",
      name: "Chakan Auto Components",
      initials: "CA",
      submitted: "Submitted 6h ago",
      secondary: "27LMNOP9012J3H4",
      risk: "Low",
      waiting: "6h",
      type: "KYB",
    },
    {
      id: "kyb-004",
      name: "Vardhan Engineering Pvt Ltd",
      initials: "VE",
      submitted: "Submitted 2h ago",
      secondary: "27XYZAB4567C8D9",
      risk: "High",
      waiting: "2h",
      type: "KYB",
    },
    {
      id: "kyb-005",
      name: "Apex Industrial Systems",
      initials: "AI",
      submitted: "Submitted 1h ago",
      secondary: "27LMNAB1234C5D6",
      risk: "Medium",
      waiting: "1h",
      type: "KYB",
    },
  ],

  integrityItems: [
    {
      id: "integrity-001",
      name: "Candidate · C218",
      initials: "C2",
      submitted: "Flagged 8h ago",
      secondary: "Duplicate device fingerprint",
      risk: "High",
      waiting: "8h",
      type: "Integrity",
    },
    {
      id: "integrity-002",
      name: "Candidate · C331",
      initials: "C3",
      submitted: "Flagged 3h ago",
      secondary: "Score anomaly on retest",
      risk: "Medium",
      waiting: "3h",
      type: "Integrity",
    },
    {
      id: "integrity-003",
      name: "Candidate · C412",
      initials: "C4",
      submitted: "Flagged 2h ago",
      secondary: "Shared device fingerprint",
      risk: "High",
      waiting: "2h",
      type: "Integrity",
    },
  ],
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