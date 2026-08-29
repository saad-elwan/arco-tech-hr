import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

// PATCH /api/advances/[id] → approve or reject
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json();
  const { status, approvedAmount, reviewNote } = body;

  const advance = await prisma.advanceRequest.update({
    where: { id: Number(id) },
    data: {
      status,
      approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
      reviewedBy: auth.id,
      reviewNote,
    }
  });

  // Send notification to the employee
  await createNotification({
    employeeId: advance.employeeId,
    type: status === "approved" ? "success" : "danger",
    category: "advance",
    title: status === "approved" ? "✅ تمت الموافقة على طلب سلفتك" : "❌ تم رفض طلب سلفتك",
    body: status === "approved"
      ? `تمت الموافقة على مبلغ ${advance.approvedAmount || advance.amount} جنيه${reviewNote ? ` — ${reviewNote}` : ""}`
      : `تم رفض طلب السلفة${reviewNote ? ` — ${reviewNote}` : ""}`
  });

  return NextResponse.json({ success: true, advance });
}
