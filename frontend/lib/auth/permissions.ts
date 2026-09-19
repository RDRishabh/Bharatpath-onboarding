import { UserRole } from "@/features/auth/types";

export type Permission =
  | "college:dashboard:view"
  | "college:students:view"
  | "college:students:invite"
  | "college:students:upload"
  | "college:analytics:view"
  | "college:settings:view"
  | "college:billing:view";

const permissions: Record<
  UserRole,
  Permission[]
> = {
  STUDENT: [],

  ADMIN: [
    "college:dashboard:view",
    "college:students:view",
    "college:analytics:view",
    "college:settings:view",
    "college:billing:view",
  ],

  EMPLOYER: [],

  COLLEGE: [
    "college:dashboard:view",
    "college:students:view",
    "college:students:invite",
    "college:students:upload",
    "college:analytics:view",
    "college:settings:view",
    "college:billing:view",
  ],
};

export function hasPermission(
  role: UserRole,
  permission: Permission,
) {
  return permissions[role]?.includes(
    permission,
  );
}