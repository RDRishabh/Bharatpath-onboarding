import { ApiError } from "@/lib/api/errors";
import { backendBaseUrl, portalForRole } from "@/lib/auth/backend-auth";
import { handleSessionExpired } from "@/lib/auth/handle-session-expired";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth/token";
import { LoginResponse, SignupRequest, SignupResponse } from "../types";

/*
 * Every call here goes straight to the backend from the browser — there is
 * no Next.js route standing in between. The backend's RS256 bearer token is
 * what authenticates subsequent requests (kept in `lib/auth/token`, attached
 * as `Authorization` by the API clients); nothing here sets a cookie.
 */

async function backendRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${backendBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const result: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      result && typeof result === "object" && "detail" in result &&
      typeof result.detail === "string"
        ? result.detail
        : "Authentication request failed.";
    const code =
      result && typeof result === "object" && "code" in result &&
      typeof result.code === "string"
        ? result.code
        : undefined;

    throw new ApiError(detail, response.status, code ?? "AUTH_ERROR");
  }

  return result as T;
}

function extractEmailFromJwt(token: string): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const claims = JSON.parse(jsonStr) as Record<string, unknown>;
    return (
      (claims.email as string) ||
      (claims.username as string) ||
      (claims["cognito:username"] as string) ||
      ""
    );
  } catch {
    return "";
  }
}

async function devSubject(email: string, pool: "CANDIDATE" | "BUSINESS") {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);

  return pool === "CANDIDATE"
    ? `local-signup-candidate-${hex}`
    : `local-signup-${hex}`;
}

/** Resolve the signed-in identity from a backend access token, and store it. */
async function resolveSession(
  accessToken: string,
  email: string,
  fallback: { pool: "CANDIDATE" | "BUSINESS" },
  options: { signup?: boolean } = {},
): Promise<LoginResponse & { needsOrganisation: boolean }> {
  let meResponse: Response;

  try {
    meResponse = await fetch(`${backendBaseUrl()}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new ApiError(
      "The authentication service is unavailable. Please try again.",
      502,
      "AUTH_ERROR",
    );
  }

  const resolvedEmail = email || extractEmailFromJwt(accessToken);

  if (!meResponse.ok) {
    const isBusiness = fallback.pool === "BUSINESS";

    // On sign-in a 403 always means "business account with no organisation
    // yet"; let them in to create one. On sign-up that is true only for the
    // `no_active_membership` code — other 403s (a conflicting pool, an
    // inactive account) must still error.
    if (meResponse.status === 403 && (!options.signup || isBusiness)) {
      let code: string | undefined;
      if (options.signup) {
        try {
          const body = (await meResponse.json()) as { code?: string };
          code = body.code;
        } catch {
          /* fall through to error below */
        }
      }

      if (!options.signup || code === "no_active_membership") {
        const mapping = isBusiness
          ? { portal: "employer" as const, path: "/employer", authRole: "EMPLOYER" as const }
          : { portal: "student" as const, path: "/student", authRole: "STUDENT" as const };

        setStoredToken(accessToken);

        return {
          user: {
            id: "",
            email: resolvedEmail,
            name: resolvedEmail,
            role: mapping.authRole,
          },
          portal: mapping.portal,
          path: mapping.path,
          backendRole: "NO_ACTIVE_MEMBERSHIP",
          needsOrganisation: isBusiness,
          token: accessToken,
        };
      }

      throw new ApiError(
        "Could not create your account. Please try again.",
        meResponse.status,
        code,
      );
    }

    let detail = "Could not confirm your account with the server.";
    let code: string | undefined;
    try {
      const body = (await meResponse.json()) as { detail?: string; code?: string };
      if (body.detail) detail = body.detail;
      code = body.code;
    } catch {
      /* keep default detail */
    }

    throw new ApiError(detail, meResponse.status, code ?? "AUTH_ERROR");
  }

  const me = (await meResponse.json()) as {
    user_id?: string;
    role?: string;
    tenant_id?: string | null;
  };

  const role = typeof me.role === "string" ? me.role : "CANDIDATE";
  const mapping = portalForRole(role);

  setStoredToken(accessToken);

  return {
    user: {
      id: me.user_id ?? "",
      email: resolvedEmail,
      name: resolvedEmail,
      role: mapping.authRole,
      tenantId: me.tenant_id ?? undefined,
    },
    portal: mapping.portal,
    path: mapping.path,
    backendRole: role,
    needsOrganisation: false,
    token: accessToken,
  };
}

export const authService = {
  /**
   * Resolve identity from a Cognito access token obtained directly in the
   * browser, and store it as the backend bearer token.
   */
  async loginWithToken(
    token: string,
    email?: string,
    pool: "CANDIDATE" | "BUSINESS" = "CANDIDATE",
  ): Promise<LoginResponse> {
    return resolveSession(token, email ?? "", { pool });
  },

  /**
   * Employer self-registration. Creates (or resumes) a business account for
   * the email and signs it in, exactly as `login` does.
   */
  async signupEmployer(payload: SignupRequest): Promise<SignupResponse> {
    return devSignup(payload.email, payload.pool ?? "BUSINESS");
  },

  /**
   * Candidate self-registration. Creates (or resumes) a candidate account
   * for the email and signs it in.
   */
  async signupCandidate(email: string): Promise<SignupResponse> {
    return devSignup(email, "CANDIDATE");
  },

  async logout(): Promise<void> {
    try {
      const { signOutCognito } = await import("@/lib/auth/cognito");
      await signOutCognito();
    } catch {
      // Ignore client cognito signout failure
    }

    clearStoredToken();
  },

  async me(): Promise<LoginResponse> {
    const token = getStoredToken();
    if (!token) {
      throw new ApiError("You are not signed in.", 401, "AUTH_ERROR");
    }

    try {
      return await resolveSession(token, "", { pool: "CANDIDATE" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleSessionExpired();
      }
      throw error;
    }
  },
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function devSignup(
  rawEmail: string,
  pool: "CANDIDATE" | "BUSINESS",
): Promise<SignupResponse> {
  const email = rawEmail.trim();

  if (!email || email.length > 255 || !EMAIL_PATTERN.test(email)) {
    throw new ApiError("Enter a valid email address.", 400, "AUTH_ERROR");
  }

  const subject = await devSubject(email, pool);

  let tokenBody: { access_token?: string };
  try {
    tokenBody = await backendRequest<{ access_token?: string }>(
      "/auth/dev/token",
      {
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ subject, pool, email }),
      },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(
        "Sign-up is disabled on the backend. Set AUTH_ALLOW_LOCAL_TOKENS=true and restart it.",
        503,
        "AUTH_ERROR",
      );
    }
    throw error;
  }

  if (!tokenBody.access_token) {
    throw new ApiError(
      "The authentication service returned an invalid token.",
      502,
      "AUTH_ERROR",
    );
  }

  try {
    const session = await resolveSession(
      tokenBody.access_token,
      email,
      { pool },
      { signup: true },
    );
    return session;
  } catch (error) {
    if (error instanceof ApiError) {
      const detail =
        error.code === "account_contact_in_use"
          ? pool === "BUSINESS"
            ? "This email is already used by a candidate account. Use a different email for your business."
            : "This email is already used by an employer or college account. Use a different email."
          : error.code === "account_inactive"
            ? "This account is no longer active."
            : error.message;

      throw new ApiError(detail, error.status, error.code);
    }
    throw error;
  }
}
