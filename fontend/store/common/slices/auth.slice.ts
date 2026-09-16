import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import { AuthUser } from "@/features/auth/types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setUser(
      state,
      action: PayloadAction<AuthUser>,
    ) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setUser,
  clearUser,
} = authSlice.actions;

export default authSlice.reducer;