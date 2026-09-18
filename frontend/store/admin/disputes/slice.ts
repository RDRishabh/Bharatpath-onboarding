import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  AdminDisputesState,
  Dispute,
  DisputeTab,
} from "@/features/admin/disputes/types";

const initialState: AdminDisputesState = {
  tab: "open",

  openId: null,

  disputes: [],

  auditItems: [],
};

const adminDisputesSlice = createSlice({
  name: "adminDisputes",

  initialState,

  reducers: {
    setDisputeTab(
      state,
      action: PayloadAction<DisputeTab>,
    ) {
      state.tab = action.payload;
    },

    openDispute(
      state,
      action: PayloadAction<string>,
    ) {
      state.openId = action.payload;
    },

    closeDispute(state) {
      state.openId = null;
    },

    setDisputes(
      state,
      action: PayloadAction<Dispute[]>,
    ) {
      state.disputes = action.payload;
    },
  },
});

export const {
  setDisputeTab,
  openDispute,
  closeDispute,
  setDisputes,
} = adminDisputesSlice.actions;

export default adminDisputesSlice.reducer;