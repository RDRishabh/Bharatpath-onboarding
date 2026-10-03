import { clearStoredToken } from "@/lib/auth/token";

export function handleSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredToken();
  window.location.replace("/login?session=timeout");
}
