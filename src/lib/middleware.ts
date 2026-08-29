import { NextRequest } from "next/server";
import { verifyToken } from "./auth";

export function getAuthFromRequest(request: NextRequest): {
  id: number;
  role: string;
  name: string;
} | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const cookieToken = request.cookies.get("hr_token")?.value;
    console.log("API cookieToken:", cookieToken?.substring(0, 30) + "...");
    if (!cookieToken) return null;
    const verified = verifyToken(cookieToken);
    console.log("API verified:", JSON.stringify(verified));
    return verified;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function isAdmin(request: NextRequest): boolean {
  const auth = getAuthFromRequest(request);
  return auth?.role === "admin";
}

export function isHROrAdmin(request: NextRequest): boolean {
  const auth = getAuthFromRequest(request);
  return auth?.role === "admin" || auth?.role === "hr";
}
