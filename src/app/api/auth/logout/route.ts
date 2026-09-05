import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthFromRequest } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (auth && auth.role !== "admin" && auth.role !== "superadmin") {
    try {
      await prisma.notification.create({
        data: {
          employeeId: 1, // Notify superadmin (assumed ID 1)
          title: "🚪 تسجيل خروج موظف",
          body: `الموظف ${auth.name} قام بتسجيل الخروج من النظام`,
          type: "info",
          category: "attendance",
          isRead: false,
        }
      });
    } catch (notifErr) {
      console.error("Logout notif error:", notifErr);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("hr_token");
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  return NextResponse.json({ user: auth });
}
