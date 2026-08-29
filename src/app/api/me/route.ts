import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const [employee, todayAttendance, monthAttendance, latestPayroll, latestEvaluation, advanceRequests, leaveRequests, assignedTasks] = await Promise.all([
    // Employee full profile
    prisma.employee.findUnique({
      where: { id: auth.id },
      select: {
        id: true, name: true, email: true, phone: true,
        basicSalary: true, role: true, hireDate: true,
        maxAdvanceLimit: true, permissions: true,
        department: { select: { name: true } },
        shift: { select: { name: true, startTime: true, endTime: true } },
      }
    }),
    // Today's attendance
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: auth.id, date: today } }
    }),
    // This month's attendance stats
    prisma.attendance.findMany({
      where: { employeeId: auth.id, date: { startsWith: thisMonth } }
    }),
    // Latest payroll
    prisma.payroll.findFirst({
      where: { employeeId: auth.id },
      orderBy: { period: "desc" }
    }),
    // Latest evaluation
    prisma.evaluation.findFirst({
      where: { employeeId: auth.id },
      orderBy: { createdAt: "desc" }
    }),
    // Advance requests
    prisma.advanceRequest.findMany({
      where: { employeeId: auth.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    // Leave requests
    prisma.leaveRequest.findMany({
      where: { employeeId: auth.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    // Assigned tasks
    prisma.task.findMany({
      where: { assignedTo: auth.id },
      orderBy: { createdAt: "desc" },
      include: { assigner: { select: { name: true } } },
      take: 10
    })
  ]);

  if (!employee) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });

  // Calculate late minutes this month
  const lateRecords = monthAttendance.filter(a => a.status === "late");
  const presentDays = monthAttendance.filter(a => a.status === "present" || a.status === "late").length;
  const absentDays = monthAttendance.filter(a => a.status === "absent").length;

  // Calculate total late hours (approximate)
  let totalLateMinutes = 0;
  if (employee.shift) {
    const [sh, sm] = employee.shift.startTime.split(":").map(Number);
    const shiftStartMinutes = sh * 60 + sm;
    for (const r of lateRecords) {
      if (r.checkIn) {
        const [h, m] = r.checkIn.split(":").map(Number);
        const checkInMinutes = h * 60 + m;
        if (checkInMinutes > shiftStartMinutes) {
          totalLateMinutes += checkInMinutes - shiftStartMinutes;
        }
      }
    }
  }

  // Total approved advances not fully repaid
  const totalAdvanceOwed = advanceRequests
    .filter(a => a.status === "approved")
    .reduce((sum, a) => sum + (a.approvedAmount - a.repaidAmount), 0);

  return NextResponse.json({
    employee,
    todayAttendance,
    stats: {
      presentDays,
      absentDays,
      lateDays: lateRecords.length,
      totalLateMinutes,
    },
    payroll: latestPayroll,
    evaluation: latestEvaluation,
    advances: {
      requests: advanceRequests,
      totalOwed: totalAdvanceOwed,
      maxLimit: employee.maxAdvanceLimit,
      available: Math.max(0, employee.maxAdvanceLimit - totalAdvanceOwed),
    },
    leaveRequests,
    tasks: assignedTasks,
  });
}
