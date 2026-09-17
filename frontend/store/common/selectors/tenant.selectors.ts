import { RootState } from "../../index";

export const selectTenant = (
  state: RootState,
) => state.tenant;

export const selectTenantId = (
  state: RootState,
) => state.tenant.tenantId;

export const selectTenantSlug = (
  state: RootState,
) => state.tenant.tenantSlug;

export const selectTenantName = (
  state: RootState,
) => state.tenant.tenantName;

export const selectPortal = (
  state: RootState,
) => state.tenant.portal;