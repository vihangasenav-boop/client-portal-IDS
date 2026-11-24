import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // =========================================
  // ADMIN AUTHENTICATION
  // =========================================

  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/auth")
  ) {
    const token = req.cookies.get("token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.redirect(
        new URL("/admin/auth/login", req.url)
      );
    }
  }

  // =========================================
  // CLIENT AUTHENTICATION
  // =========================================

  if (pathname.startsWith("/clientDashboard")) {
    const clientToken = req.cookies.get("client-token")?.value;

    const decoded = clientToken
      ? verifyToken(clientToken)
      : null;

    if (!decoded || decoded.role !== "CLIENT") {
      return NextResponse.redirect(
        new URL("/user-login", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/clientDashboard/:path*",
  ],
};