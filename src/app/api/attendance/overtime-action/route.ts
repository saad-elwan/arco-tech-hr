import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { attendanceId, action } = await request.json();

  if (!attendanceId || !action) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { employee: { include: { shift: true } } }
  });

  if (!attendance) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  if (action === "checkout") {
    // Auto-checkout at shift end time or current time
    const shiftEndTime = attendance.employee.shift?.endTime || "17:00";
    
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOut: shiftEndTime,
        source: "auto_checkout",
        overtimeStatus: "rejected"
      }
    });

    await createNotification({
      employeeId: attendance.employeeId,
      type: "info",
      category: "attendance",
      title: "تسجيل انصراف تلقائي",
      body: `تم تسجيل انصرافك تلقائياً لانتهاء فترة العمل الرسمية الساعة ${shiftEndTime}`,
    });

    return NextResponse.json({ success: true, message: "تم تسجيل الانصراف التلقائي" });
  }

  if (action === "overtime") {
    // Approve overtime session
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        overtimeStatus: "pending"
      }
    });

    await createNotification({
      employeeId: attendance.employeeId,
      type: "success",
      category: "attendance",
      title: "طلب وقت إضافي (Overtime)",
      body: "لقد وافقت الإدارة على بقائك لفترة إضافية. يرجى تسجيل الانصراف يدوياً عند الانتهاء.",
    });

    return NextResponse.json({ success: true, message: "تم تحويل الموظف لوضع الوقت الإضافي" });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
