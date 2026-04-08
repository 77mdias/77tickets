import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type UserRole = "customer" | "organizer" | "admin" | "checker";

const ADMIN_ROLES: readonly UserRole[] = ["admin"];
const CHECKIN_ROLES: readonly UserRole[] = ["admin", "organizer", "checker"];

async function getSessionRole(request: NextRequest): Promise<UserRole | null> {
  try {
    const sessionUrl = new URL("/api/auth/get-session", request.url);
    const res = await fetch(sessionUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { role?: string } } | null;
    const role = data?.user?.role;
    if (!role) return null;
    return role as UserRole;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, next: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const role = await getSessionRole(request);

  if (pathname.startsWith("/admin")) {
    if (!role || !ADMIN_ROLES.includes(role)) {
      return redirectToLogin(request, pathname);
    }
  }

  if (pathname.startsWith("/checkin")) {
    if (!role || !CHECKIN_ROLES.includes(role)) {
      return redirectToLogin(request, pathname);
    }
  }

  if (pathname.startsWith("/meus-ingressos")) {
    if (!role) {
      return redirectToLogin(request, pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/checkin/:path*", "/meus-ingressos/:path*"],
};
