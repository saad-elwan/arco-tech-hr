import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

// POST /api/advances → create advance request
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { amount, reason } = body;

  if (!amount || !reason) {
    return NextResponse.json({ error: "المبلغ والسبب مطلوبان" }, { status: 400 });
  }

  // Check max advance limit
  const employee = await prisma.employee.findUnique({
    where: { id: auth.id },
    select: { maxAdvanceLimit: true }
  });

  const totalOwed = await prisma.advanceRequest.aggregate({
    where: { employeeId: auth.id, status: "approved" },
    _sum: { approvedAmount: true, repaidAmount: true }
  });

  const currentOwed = (totalOwed._sum.approvedAmount || 0) - (totalOwed._sum.repaidAmount || 0);
  const available = (employee?.maxAdvanceLimit || 0) - currentOwed;

  if (amount > available) {
    return NextResponse.json({
      error: `الحد المتاح للسلفة هو ${available.toFixed(2)} جنيه`
    }, { status: 400 });
  }

  const advance = await prisma.advanceRequest.create({
    data: { employeeId: auth.id, amount: Number(amount), reason }
  });

  // Notify admins and superadmins
  try {
    const admins = await prisma.employee.findMany({
      where: { role: { in: ["superadmin", "admin", "hr"] } },
      select: { id: true }
    });
    const empData = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true } });
    for (const adm of admins) {
      await prisma.notification.create({
        data: {
          employeeId: adm.id,
          title: "💵 طلب سلفة جديد",
          body: `الموظف ${empData?.name || auth.name} تقدم بطلب سلفة بمبلغ ${Number(amount).toLocaleString('ar-EG')} ج.م (السبب: ${reason})`,
          category: "finance",
          type: "warning",
          link: "/finance",
          isRead: false,
        }
      });
    }
  } catch (err) {
    console.error("Advance notification error:", err);
  }

  return NextResponse.json({ success: true, advance });
}

// GET /api/advances → list for current user (employee) or all (admin/hr)
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (auth.role === "employee") {
    const advances = await prisma.advanceRequest.findMany({
      where: { employeeId: auth.id },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ advances });
  }

  // admin or hr sees all
  const advances = await prisma.advanceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } }
    }
  });
  return NextResponse.json({ advances });
}
