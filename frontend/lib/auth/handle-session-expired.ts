import { signOutCognito } from "@/lib/auth/cognito";
import { clearStoredToken } from "@/lib/auth/token";

export function handleSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredToken();
  // Clear Cognito's own stored tokens too, or the next sign-in is refused.
  void signOutCognito().finally(() => {
    window.location.replace("/login?session=timeout");
  });
}
