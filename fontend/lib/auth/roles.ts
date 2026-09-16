import { UserRole } from "@/features/auth/types";

export const ROLE_PORTAL_MAP: Record<
  UserRole,
  string
> = {
  STUDENT: "student",
  ADMIN: "admin",
  COLLEGE: "college",
  EMPLOYER: "employer",
};