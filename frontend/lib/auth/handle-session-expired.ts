import { signOutCognito } from "@/lib/auth/cognito";
import { clearStoredToken } from "@/lib/auth/token";
import { isPublicAuthPath } from "@/lib/auth/session-routes";

let expired = false;
const listeners = new Set<() => void>();

export function isSessionExpired(): boolean { return expired; }
export function subscribeSessionExpired(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function handleSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (expired || isPublicAuthPath(window.location.pathname)) return;
  expired = true;
  clearStoredToken();
  listeners.forEach((listener) => listener());
}

export async function redirectAfterSessionExpired(): Promise<void> {
  clearStoredToken();
  try { await signOutCognito(); }
  finally { window.location.replace("/login?session=timeout"); }
}
