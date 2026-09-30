"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { handleSessionExpired } from "@/lib/auth/handle-session-expired";
import { isPublicAuthPath } from "@/lib/auth/session-routes";
import { getStoredToken } from "@/lib/auth/token";
import { getTokenExpiration } from "@/lib/auth/token-expiration";

const MAX_TIMEOUT = 2_147_483_647;

export function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (isPublicAuthPath(pathname)) {
      return;
    }

    let timeoutId: number | undefined;

    const checkSession = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      const token = getStoredToken();
      const expiration = token ? getTokenExpiration(token) : null;

      if (!expiration) {
        handleSessionExpired();
        return;
      }

      const remaining = expiration * 1000 - Date.now();
      if (remaining <= 0) {
        handleSessionExpired();
        return;
      }

      timeoutId = window.setTimeout(
        checkSession,
        Math.min(remaining, MAX_TIMEOUT),
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        checkSession();
      }
    };

    checkSession();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", checkSession);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", checkSession);
    };
  }, [pathname]);

  return null;
}
