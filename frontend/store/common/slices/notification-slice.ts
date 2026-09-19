import { createSlice } from "@reduxjs/toolkit";

export interface NotificationUIState {
  isOpen: boolean;
}

const initialState: NotificationUIState = {
  isOpen: false,
};

const notificationSlice = createSlice({
  name: "notificationUI",

  initialState,

  reducers: {
    openNotifications: (state) => {
      state.isOpen = true;
    },

    closeNotifications: (state) => {
      state.isOpen = false;
    },

    toggleNotifications: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const {
  openNotifications,
  closeNotifications,
  toggleNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;