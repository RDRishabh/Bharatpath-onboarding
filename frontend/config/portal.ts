export const PORTAL_TYPES = {
  STUDENT: "student",
  ADMIN: "admin",
  EMPLOYER: "employer",
  COLLEGE: "college",
} as const;

export type PortalType =
  (typeof PORTAL_TYPES)[keyof typeof PORTAL_TYPES];