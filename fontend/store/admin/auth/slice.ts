import { createSlice, PayloadAction } from "@reduxjs/toolkit";
export interface AdminAuthState { authenticated: boolean; operator: { name: string; role: string } | null; }
const initialState: AdminAuthState = { authenticated: false, operator: null };
const slice = createSlice({ name: "adminAuth", initialState, reducers: {
  setAuthenticated: (state, action: PayloadAction<boolean>) => { state.authenticated = action.payload; if (!action.payload) state.operator = null; },
  signIn: (state, action: PayloadAction<{ name: string; role: string }>) => { state.authenticated = true; state.operator = action.payload; },
  signOut: state => { state.authenticated = false; state.operator = null; },
}});
export const { setAuthenticated, signIn, signOut } = slice.actions;
export default slice.reducer;
