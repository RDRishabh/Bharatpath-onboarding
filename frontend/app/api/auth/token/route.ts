import { NextResponse } from "next/server";

import {
  AuthConfigurationError,
  backendBaseUrl,
  loadAccount,
  portalForRole,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/backend-auth";

const UPSTREAM_HEADERS = {
  "content-type": "application/json",
};

function extractEmailFromJwt(token: string): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
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

export async function POST(request: Request) {
  let email = "";
  let token = "";
  let pool = "CANDIDATE";

  try {
    const body: unknown = await request.json();

    if (body && typeof body === "object") {
      if ("email" in body && typeof body.email === "string") {
        email = body.email.trim();
      }
      if ("token" in body && typeof body.token === "string") {
        token = body.token.trim();
      }
      if ("pool" in body && typeof body.pool === "string") {
        pool = body.pool.trim();
      }
    }
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body." },
      { status: 400 },
    );
  }

  let base: string;

  try {
    base = backendBaseUrl();
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error(error.message);

      return NextResponse.json(
        { detail: "Authentication is not configured on this server." },
        { status: 500 },
      );
    }

    throw error;
  }

  let accessToken = token;

  // If no direct Cognito token provided, attempt the local-dev token endpoint
  if (!accessToken) {
    if (!email) {
      return NextResponse.json(
        { detail: "Email or authentication token is required." },
        { status: 400 },
      );
    }

    let account;
    try {
      account = await loadAccount(email);
    } catch (error) {
      console.error("Could not read account directory.", error);
    }

    if (!account) {
      return NextResponse.json(
        {
          detail:
            "No account found for that email. Please sign in with your password or register.",
        },
        { status: 401 },
      );
    }

    try {
      const tokenResponse = await fetch(`${base}/auth/dev/token`, {
        method: "POST",
        cache: "no-store",
        headers: UPSTREAM_HEADERS,
        body: JSON.stringify({
          subject: account.subject,
          pool: account.pool,
          email: account.email,
        }),
      });

      if (!tokenResponse.ok) {
        return NextResponse.json(
          {
            detail:
              "Local token minting disabled. Please sign in with your Cognito password.",
          },
          { status: tokenResponse.status === 404 ? 503 : 502 },
        );
      }

      const tokenBody = (await tokenResponse.json()) as {
        access_token?: string;
      };
      accessToken = tokenBody.access_token ?? "";
    } catch (error) {
      console.error("Token endpoint unreachable.", error);
      return NextResponse.json(
        { detail: "Authentication service unavailable. Please try again." },
        { status: 502 },
      );
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { detail: "Missing authentication token." },
      { status: 400 },
    );
  }

  // Fallback email from JWT claims if not explicitly passed
  if (!email) {
    email = extractEmailFromJwt(accessToken);
  }

  // Resolve authoritative identity from backend
  let meResponse: Response;

  try {
    meResponse = await fetch(`${base}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Identity endpoint unreachable.", error);

    return NextResponse.json(
      { detail: "The authentication service is unavailable. Please try again." },
      { status: 502 },
    );
  }

  if (!meResponse.ok) {
    if (meResponse.status === 403) {
      // Business account with no organisation yet: allow them in to complete setup
      const isBusiness = pool === "BUSINESS";
      const fallbackPortal = isBusiness ? "employer" : "student";
      const fallbackPath = isBusiness ? "/employer/settings" : "/student";

      const response = NextResponse.json({
        user: {
          id: "",
          email,
          name: email,
          role: isBusiness ? "EMPLOYER" : "STUDENT",
        },
        portal: fallbackPortal,
        path: fallbackPath,
        backendRole: "NO_ACTIVE_MEMBERSHIP",
        needsOrganisation: isBusiness,
        token: accessToken,
      });

      response.cookies.set(SESSION_COOKIE, accessToken, sessionCookieOptions());
      return response;
    }

    return NextResponse.json(
      { detail: "Could not confirm your account with the server." },
      { status: meResponse.status },
    );
  }

  const me = (await meResponse.json()) as {
    user_id?: string;
    role?: string;
    tenant_id?: string | null;
  };

  const role = typeof me.role === "string" ? me.role : "CANDIDATE";
  const mapping = portalForRole(role);

  const response = NextResponse.json({
    user: {
      id: me.user_id ?? "",
      email: email,
      name: email,
      role: mapping.authRole,
      tenantId: me.tenant_id ?? undefined,
    },
    portal: mapping.portal,
    path: mapping.path,
    backendRole: role,
    token: accessToken,
  });

  response.cookies.set(SESSION_COOKIE, accessToken, sessionCookieOptions());

  return response;
}
