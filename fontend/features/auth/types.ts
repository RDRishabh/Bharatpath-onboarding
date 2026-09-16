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
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}