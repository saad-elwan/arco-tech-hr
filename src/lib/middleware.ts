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
    if (!cookieToken) return null;
    const verified = verifyToken(cookieToken);
    return verified;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function isAdmin(request: NextRequest): boolean {
  const auth = getAuthFromRequest(request);
  return auth?.role === "admin" || auth?.role === "superadmin";
}

export function isSuperAdmin(request: NextRequest): boolean {
  const auth = getAuthFromRequest(request);
  return auth?.role === "superadmin";
}

export function isHROrAdmin(request: NextRequest): boolean {
  const auth = getAuthFromRequest(request);
  return auth?.role === "admin" || auth?.role === "hr" || auth?.role === "superadmin";
}

export async function canAccessFinance(request: NextRequest): Promise<boolean> {
  const auth = getAuthFromRequest(request);
  if (!auth) return false;
  if (auth.role === "admin" || auth.role === "hr" || auth.role === "superadmin") return true;
  
  // Check if employee has custom /finance permission
  const { prisma } = await import("@/lib/prisma");
  const emp = await prisma.employee.findUnique({
    where: { id: auth.id },
    select: { permissions: true }
  });
  if (!emp?.permissions) return false;
  try {
    const perms = typeof emp.permissions === "string" ? JSON.parse(emp.permissions) : emp.permissions;
    return Array.isArray(perms) && perms.includes("/finance");
  } catch {
    return false;
  }
}

