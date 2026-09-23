export type UserRole =
  | "STUDENT"
  | "ADMIN"
  | "EMPLOYER"
  | "COLLEGE";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
}

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  user: AuthUser;
  /** The portal that serves this account: student | employer | college | admin. */
  portal: string;
  /** The path to redirect to after a successful sign-in. */
  path: string;
  /** The authoritative backend membership role (e.g. EMPLOYER_OWNER). */
  backendRole: string;
}
