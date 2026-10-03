export type Pool = "CANDIDATE" | "BUSINESS";

export type Portal = "student" | "employer" | "college" | "admin";

export type AuthRole = "STUDENT" | "EMPLOYER" | "COLLEGE" | "ADMIN";

/** The backend's base URL (e.g. https://bharatpath-api.duckdns.org/api/v1). */
export function backendBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bharatpath-api.duckdns.org/api/v1";

  return base.replace(/\/$/, "");
}

const STAFF_ROLES = new Set([
  "PLATFORM_ADMIN",
  "KYB_REVIEWER",
  "INTEGRITY_REVIEWER",
  "SUPPORT_AGENT",
]);

/** Map a backend membership role to the portal that serves it. */
export function portalForRole(role: string): {
  portal: Portal;
  path: string;
  authRole: AuthRole;
} {
  if (role === "CANDIDATE") {
    return { portal: "student", path: "/student", authRole: "STUDENT" };
  }

  if (role.startsWith("EMPLOYER")) {
    return { portal: "employer", path: "/employer", authRole: "EMPLOYER" };
  }

  if (role.startsWith("COLLEGE")) {
    return { portal: "college", path: "/college", authRole: "COLLEGE" };
  }

  if (STAFF_ROLES.has(role)) {
    return { portal: "admin", path: "/admin", authRole: "ADMIN" };
  }

  // A candidate holds no membership, so an unknown/blank role is treated as one.
  return { portal: "student", path: "/student", authRole: "STUDENT" };
}
