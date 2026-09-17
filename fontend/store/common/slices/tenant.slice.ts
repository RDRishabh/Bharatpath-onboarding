import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import { PortalType } from "@/config/portal";

export interface TenantState {
  portal: PortalType | null;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
}

const initialState: TenantState = {
  portal: null,
  tenantId: null,
  tenantSlug: null,
  tenantName: null,
};

const tenantSlice = createSlice({
  name: "tenant",

  initialState,

  reducers: {
    setTenant(
      state,
      action: PayloadAction<TenantState>,
    ) {
      state.portal = action.payload.portal;
      state.tenantId = action.payload.tenantId;
      state.tenantSlug =
        action.payload.tenantSlug;
      state.tenantName =
        action.payload.tenantName;
    },

    clearTenant(state) {
      state.portal = null;
      state.tenantId = null;
      state.tenantSlug = null;
      state.tenantName = null;
    },
  },
});

export const {
  setTenant,
  clearTenant,
} = tenantSlice.actions;

export default tenantSlice.reducer;