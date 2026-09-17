import {
  PORTAL_TYPES,
  PortalType,
} from "@/config/portal";

export function resolvePortalFromHost(
  hostname: string,
): {
  portal: PortalType;
  tenantSlug?: string;
} {
  const host = hostname
    .split(":")[0]
    .toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return {
      portal: PORTAL_TYPES.COLLEGE,
      tenantSlug: "development",
    };
  }

  const parts = host.split(".");

  if (parts.length < 3) {
    return {
      portal: PORTAL_TYPES.STUDENT,
    };
  }

  const subdomain = parts[0];

  if (subdomain === "admin") {
    return {
      portal: PORTAL_TYPES.ADMIN,
    };
  }

  return {
    portal: PORTAL_TYPES.COLLEGE,
    tenantSlug: subdomain,
  };
}