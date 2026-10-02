import bundledAccounts from "./accounts.json";

/**
 * The seeded account directory (written by backend/scripts/seed_demo.py),
 * bundled with the frontend so the email-only local-dev sign-in has
 * something to resolve a subject from. Looked up entirely in the browser —
 * there is no server hop between the login form and the backend anymore.
 */
export type Pool = "CANDIDATE" | "BUSINESS";

export type Portal = "student" | "employer" | "college" | "admin";

export type AuthRole = "STUDENT" | "EMPLOYER" | "COLLEGE" | "ADMIN";

export interface DevAccount {
  email: string;
  subject: string;
  pool: Pool;
  role: string;
  group: string;
}

/** The backend's base URL (e.g. https://bharatpath-api.duckdns.org/api/v1). */
export function backendBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bharatpath-api.duckdns.org/api/v1";

  return base.replace(/\/$/, "");
}

/**
 * Look up a seeded account by email. Returns `null` when the email is not in
 * the bundled directory.
 */
export function loadAccount(email: string): DevAccount | null {
  const target = email.trim().toLowerCase();
  const list = bundledAccounts as DevAccount[];

  return (
    list.find(
      (account) =>
        typeof account?.email === "string" &&
        account.email.toLowerCase() === target,
    ) ?? null
  );
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
