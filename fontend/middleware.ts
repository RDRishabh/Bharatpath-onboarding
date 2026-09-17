import {
  NextRequest,
  NextResponse,
} from "next/server";

const PORTAL_HOSTS = {
  admin: "admin",
  employer: "employer",
  college: "college",
  student: "student",
} as const;

type PortalType =
  | "admin"
  | "employer"
  | "college"
  | "student";

function getHostname(request: NextRequest) {
  const host =
    request.headers.get("host") ?? "";

  return host
    .split(":")[0]
    .toLowerCase();
}

function getPortalFromHostname(
  hostname: string
): {
  portal: PortalType;
  tenantSlug: string | null;
} {
  /*
   * LOCAL DEVELOPMENT
   *
   * student.localhost
   * admin.localhost
   * college.localhost
   * employer.localhost
   *
   * PRODUCTION
   *
   * bharatpath.com
   * admin.bharatpath.com
   * college.bharatpath.com
   * employer.bharatpath.com
   *
   * TENANT BASED
   *
   * collegename.bharatpath.com
   * employername.bharatpath.com
   */

  const parts = hostname.split(".");

  /*
   * localhost
   */
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return {
      portal: "student",
      tenantSlug: null,
    };
  }

  /*
   * *.localhost
   *
   * Example:
   *
   * college.localhost
   * employer.localhost
   * admin.localhost
   */
  if (hostname.endsWith(".localhost")) {
    const subdomain =
      parts[0] ?? "";

    if (
      subdomain ===
      PORTAL_HOSTS.admin
    ) {
      return {
        portal: "admin",
        tenantSlug: null,
      };
    }

    if (
      subdomain ===
      PORTAL_HOSTS.student
    ) {
      return {
        portal: "student",
        tenantSlug: null,
      };
    }

    if (
      subdomain ===
      PORTAL_HOSTS.college
    ) {
      return {
        portal: "college",
        tenantSlug: null,
      };
    }

    if (
      subdomain ===
      PORTAL_HOSTS.employer
    ) {
      return {
        portal: "employer",
        tenantSlug: null,
      };
    }

    /*
     * Tenant development domains.
     *
     * collegename.localhost
     * employername.localhost
     *
     * We cannot know whether an arbitrary
     * subdomain is college or employer
     * without looking it up in the backend.
     *
     * For now, treat it as tenant.
     */
    return {
      portal: "college",
      tenantSlug: subdomain || null,
    };
  }

  /*
   * PRODUCTION
   *
   * admin.bharatpath.com
   * employer.bharatpath.com
   * college.bharatpath.com
   */
  if (
    hostname === "admin.bharatpath.com"
  ) {
    return {
      portal: "admin",
      tenantSlug: null,
    };
  }

  if (
    hostname === "employer.bharatpath.com"
  ) {
    return {
      portal: "employer",
      tenantSlug: null,
    };
  }

  if (
    hostname === "college.bharatpath.com"
  ) {
    return {
      portal: "college",
      tenantSlug: null,
    };
  }

  if (
    hostname === "bharatpath.com" ||
    hostname === "www.bharatpath.com"
  ) {
    return {
      portal: "student",
      tenantSlug: null,
    };
  }

  /*
   * Tenant production domains.
   *
   * collegename.bharatpath.com
   * employername.bharatpath.com
   *
   * The exact portal should ideally be
   * resolved by your backend/database.
   *
   * Defaulting to college here keeps the
   * application usable until tenant
   * resolution is added.
   */
  if (
    hostname.endsWith(
      ".bharatpath.com"
    )
  ) {
    const subdomain =
      parts[0] ?? "";

    return {
      portal: "college",
      tenantSlug:
        subdomain || null,
    };
  }

  /*
   * Unknown host
   */
  return {
    portal: "student",
    tenantSlug: null,
  };
}

export function middleware(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  /*
   * Always allow Next.js internals,
   * static files and API routes.
   *
   * This is especially important for:
   *
   * /api/v1/notifications
   * /api/auth/*
   * /_next/*
   */
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  const hostname =
    getHostname(request);

  const {
    portal,
    tenantSlug,
  } =
    getPortalFromHostname(hostname);

  /*
   * Clone the request headers so that
   * server components, route handlers,
   * layouts and APIs can know which portal
   * is being accessed.
   */
  const requestHeaders =
    new Headers(request.headers);

  requestHeaders.set(
    "x-bharatpath-portal",
    portal
  );

  if (tenantSlug) {
    requestHeaders.set(
      "x-bharatpath-tenant",
      tenantSlug
    );
  } else {
    requestHeaders.delete(
      "x-bharatpath-tenant"
    );
  }

  /*
   * Also expose the hostname.
   */
  requestHeaders.set(
    "x-bharatpath-host",
    hostname
  );

  /*
   * Continue the request.
   */
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Run middleware on all application
     * routes except static assets.
     *
     * API routes are additionally skipped
     * inside middleware so they remain safe
     * even if this matcher is expanded later.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};