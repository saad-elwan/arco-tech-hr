import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "hr-system-secret-key-2024";

// Pages that require authentication
const protectedPaths = ["/dashboard", "/employees", "/attendance", "/tasks", "/evaluations", "/finance", "/tracking", "/shifts", "/departments", "/reports", "/settings", "/me", "/requests", "/profile", "/super-admin"];

// Pages for guests only (redirect to dashboard if already logged in)
const guestOnlyPaths = ["/", "/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("hr_token")?.value;
  let isValid = false;
  let decodedToken: any = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      decodedToken = payload;
      isValid = true;
    } catch {
      isValid = false;
    }
  }

  // If on a protected page and not logged in → redirect to login
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !isValid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based authorization for employees
  if (isValid && decodedToken?.role === "employee") {
    const allowedEmployeePaths = ["/me", "/profile", "/tasks", "/attendance", "/requests", "/tracking"];
    const isAllowedForEmployee = allowedEmployeePaths.some((p) => pathname.startsWith(p));
    
    // Prevent access to admin pages (e.g. /dashboard, /finance, /super-admin)
    if (isProtected && !isAllowedForEmployee) {
      return NextResponse.redirect(new URL("/me", request.url));
    }
  }

  const response = NextResponse.next();

  // Force-remove X-Frame-Options and inject iOS-friendly headers
  // This overrides Vercel's default SAMEORIGIN header
  response.headers.delete("X-Frame-Options");
  response.headers.set("Content-Security-Policy", "frame-ancestors *; upgrade-insecure-requests; script-src 'self' https://cdn.jsdelivr.net");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|manifest.json|sw.js|arco-logo.png).*)",
  ],
};
