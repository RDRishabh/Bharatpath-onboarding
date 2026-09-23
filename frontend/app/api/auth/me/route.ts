import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AuthConfigurationError,
  backendBaseUrl,
  portalForRole,
  SESSION_COOKIE,
} from "@/lib/auth/backend-auth";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "You are not signed in." },
      { status: 401 },
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

  let upstream: Response;

  try {
    upstream = await fetch(`${base}/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Identity endpoint unreachable.", error);

    return NextResponse.json(
      { detail: "The authentication service is unavailable." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { detail: "Your session is no longer valid." },
      { status: 401 },
    );
  }

  const me = (await upstream.json()) as {
    user_id?: string;
    role?: string;
    email?: string;
    tenant_id?: string | null;
  };

  const mapping = portalForRole(
    typeof me.role === "string" ? me.role : "",
  );

  return NextResponse.json({
    user: {
      id: me.user_id ?? "",
      email: me.email ?? "",
      name: me.email ?? "",
      role: mapping.authRole,
      tenantId: me.tenant_id ?? undefined,
    },
    portal: mapping.portal,
    path: mapping.path,
    backendRole: me.role ?? "",
  });
}
