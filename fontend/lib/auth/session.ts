import { AuthUser } from "@/features/auth/types";

let currentUser: AuthUser | null = null;

export function setSession(
  user: AuthUser,
) {
  currentUser = user;
}

export function getSession() {
  return currentUser;
}

export function clearSession() {
  currentUser = null;
}