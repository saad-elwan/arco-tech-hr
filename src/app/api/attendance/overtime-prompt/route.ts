import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];
  
  // Find employees who checked in today but haven't checked out yet
  const activeAttendances = await prisma.attendance.findMany({
    where: {
      date: today,
      checkIn: { not: null },
      checkOut: null,
      employee: { role: { notIn: ["admin", "superadmin"] } }
    },
    include: {
      employee: {
        include: { shift: true }
      }
    }
  });

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMinute;

  // We consider an employee eligible for prompt if their shift end time has passed or is very close
  const prompts = [];

  for (const record of activeAttendances) {
    const shift = record.employee.shift;
    if (shift && shift.endTime) {
      const [endH, endM] = shift.endTime.split(":").map(Number);
      const shiftEndMins = endH * 60 + endM;

      // If the current time is at or after the shift end time
      if (currentTotalMins >= shiftEndMins && !record.overtimeStatus) {
        prompts.push({
          attendanceId: record.id,
          employeeId: record.employeeId,
          employeeName: record.employee.name,
          shiftEndTime: shift.endTime,
          checkIn: record.checkIn
        });
      }
    }
  }

  return NextResponse.json({ prompts }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
