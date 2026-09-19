import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AdminFeedbackState {
  message: string | null;
}

const initialState: AdminFeedbackState = {
  message: null,
};

const adminFeedbackSlice = createSlice({
  name: "adminFeedback",
  initialState,
  reducers: {
    showAdminFeedback(state, action: PayloadAction<string>) {
      state.message = action.payload;
    },
    clearAdminFeedback(state) {
      state.message = null;
    },
  },
});

export const { clearAdminFeedback, showAdminFeedback } = adminFeedbackSlice.actions;

export default adminFeedbackSlice.reducer;