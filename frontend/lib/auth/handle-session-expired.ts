import { clearStoredToken } from "@/lib/auth/token";

let redirecting = false;

export function handleSessionExpired(): void {
  if (typeof window === "undefined" || redirecting) {
    return;
  }

  redirecting = true;
  clearStoredToken();
  window.location.replace("/api/auth/logout?session=timeout");
}
