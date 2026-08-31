import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Employee role: redirect signal only
  if (auth.role === "employee") {
    return NextResponse.json({ role: "employee" });
  }

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const employeeFilter = { status: "active", role: { notIn: ["admin", "superadmin"] } };

  const [
    totalEmployees,
    activeEmployees,
    todayAttendance,
    todayLate,
    monthAttendance,
    tasksStats,
    topEmployees,
    recentActivity,
  ] = await Promise.all([
    prisma.employee.count({ where: employeeFilter }),
    prisma.employee.count({ where: employeeFilter }),
    prisma.attendance.count({
      where: { 
        date: today, 
        status: { in: ["present", "late"] },
        employee: { role: { notIn: ["admin", "superadmin"] } }
      },
    }),
    prisma.attendance.count({ 
      where: { 
        date: today, 
        status: "late",
        employee: { role: { notIn: ["admin", "superadmin"] } }
      } 
    }),
    prisma.attendance.groupBy({
      by: ["date"],
      where: { 
        date: { startsWith: thisMonth },
        employee: { role: { notIn: ["admin", "superadmin"] } }
      },
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.evaluation.findMany({
      where: { employee: { role: { notIn: ["admin", "superadmin"] } } },
      orderBy: { totalScore: "desc" },
      take: 5,
      include: { employee: { select: { name: true, department: { select: { name: true } } } } },
    }),
    prisma.attendance.findMany({
      where: { 
        date: today,
        employee: { role: { notIn: ["admin", "superadmin"] } }
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { name: true } } },
    }),
  ]);

  const absentToday = activeEmployees - todayAttendance;

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const attendanceMap = new Map(
    monthAttendance.map((a) => [a.date, a._count.id])
  );

  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const dateKey = `${thisMonth}-${day}`;
    return {
      day: i + 1,
      count: attendanceMap.get(dateKey) || 0,
    };
  }).filter((d) => d.day <= new Date().getDate());

  const tasksByStatus = tasksStats.reduce(
    (acc, t) => ({ ...acc, [t.status]: t._count.id }),
    {} as Record<string, number>
  );

  return NextResponse.json({
    role: auth.role,
    stats: {
      totalEmployees,
      todayPresent: todayAttendance,
      todayAbsent: absentToday,
      todayLate,
    },
    chartData,
    tasksByStatus,
    topEmployees,
    recentActivity,
  });
}
