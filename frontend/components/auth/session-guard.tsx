"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { handleSessionExpired } from "@/lib/auth/handle-session-expired";
import { isPublicAuthPath } from "@/lib/auth/session-routes";
import { getStoredToken } from "@/lib/auth/token";
import { getTokenExpiration } from "@/lib/auth/token-expiration";
import { clearUser } from "@/store/common/slices/auth.slice";
import { clearTenant } from "@/store/common/slices/tenant.slice";
import { useAppDispatch } from "@/store/hooks";

const MAX_TIMEOUT = 2_147_483_647;

export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

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

      if (!token) {
        dispatch(clearUser());
        dispatch(clearTenant());
        router.replace("/login");
        return;
      }

      if (!expiration) {
        dispatch(clearUser());
        dispatch(clearTenant());
        handleSessionExpired();
        return;
      }

      const remaining = expiration * 1000 - Date.now();
      if (remaining <= 0) {
        dispatch(clearUser());
        dispatch(clearTenant());
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
  }, [dispatch, pathname, router]);

  return null;
}
