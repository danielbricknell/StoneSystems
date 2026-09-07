import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const PUBLIC_PATHS = ["/login", "/api/health", "/request-service"];

// Field Techs get "job details, schedule, notes, and time entry only" per
// the spec — everything else (customers, quotes, invoices, inventory,
// team/service-request management) is out of reach even by direct URL.
const FIELD_TECH_ALLOWED_PREFIXES = ["/jobs", "/schedule", "/time", "/search"];

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

async function getSessionRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.roleName === "string" ? payload.roleName : null;
  } catch {
    return null;
  }
}

function isFieldTechAllowed(pathname: string): boolean {
  if (pathname === "/") return true;
  return FIELD_TECH_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const roleName = await getSessionRole(request);
  if (!roleName) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (roleName === "Field Tech" && !isFieldTechAllowed(pathname)) {
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  // manage_users is Admin-only in every seeded role but Admin itself.
  if (pathname.startsWith("/users") && roleName !== "Admin") {
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
