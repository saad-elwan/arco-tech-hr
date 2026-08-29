import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

// PATCH /api/leaves/[id] → approve or reject
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json();
  const { status, reviewNote } = body;

  const leave = await prisma.leaveRequest.update({
    where: { id: Number(id) },
    data: { status, reviewedBy: auth.id, reviewNote }
  });

  const typeLabel = leave.type === "vacation" ? "إجازة" : leave.type === "early_leave" ? "انصراف مبكر" : "غياب بإذن";
  await createNotification({
    employeeId: leave.employeeId,
    type: status === "approved" ? "success" : "danger",
    category: "leave",
    title: status === "approved" ? `✅ تمت الموافقة على طلب ${typeLabel}` : `❌ تم رفض طلب ${typeLabel}`,
    body: reviewNote || (status === "approved" ? `تمت الموافقة على طلبك ليوم ${leave.date}` : `تم رفض طلب ${typeLabel} ليوم ${leave.date}`)
  });

  return NextResponse.json({ success: true, leave });
}
