import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { type, date, duration, reason } = body;

  if (!type || !date || !reason) {
    return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: auth.id,
      type,
      date,
      duration: Number(duration) || 1,
      reason,
    }
  });

  // Notify admins and superadmins
  try {
    const admins = await prisma.employee.findMany({
      where: { role: { in: ["superadmin", "admin", "hr"] } },
      select: { id: true }
    });
    const empData = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true } });
    const leaveTypeName = type === "vacation" ? "إجازة سنوية/عارضة" : type === "early_leave" ? "إذن انصراف مبكر" : "إذن غياب";
    for (const adm of admins) {
      await prisma.notification.create({
        data: {
          employeeId: adm.id,
          title: "🏖️ طلب إجازة / إذن جديد",
          body: `الموظف ${empData?.name || auth.name} تقدم بطلب (${leaveTypeName}) لتاريخ ${date} (السبب: ${reason})`,
          category: "requests",
          type: "info",
          link: "/requests",
          isRead: false,
        }
      });
    }
  } catch (err) {
    console.error("Leave notification error:", err);
  }

  return NextResponse.json({ success: true, leave });
}

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (auth.role === "employee") {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: auth.id },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ leaves });
  }

  // Admin / HR: see all
  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } }
    }
  });
  return NextResponse.json({ leaves });
}
