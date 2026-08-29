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
