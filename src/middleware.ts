import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "hr-system-secret-key-2024";

// Pages that require authentication
const protectedPaths = ["/dashboard", "/employees", "/attendance", "/tasks", "/evaluations", "/finance", "/tracking", "/shifts", "/departments", "/reports", "/settings", "/me", "/requests", "/profile"];

// Pages for guests only (redirect to dashboard if already logged in)
const guestOnlyPaths = ["/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("hr_token")?.value;
  let isValid = false;

  if (token) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secret);
      isValid = true;
    } catch {
      isValid = false;
    }
  }

  // If on a protected page and not logged in → redirect to login
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !isValid) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If on login page and already logged in → redirect to dashboard
  if (guestOnlyPaths.includes(pathname) && isValid) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
