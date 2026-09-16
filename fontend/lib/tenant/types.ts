import { PortalType } from "@/config/portal";

export interface TenantContext {
  portal: PortalType;
  tenantId?: string;
  tenantSlug?: string;
  hostname: string;
}