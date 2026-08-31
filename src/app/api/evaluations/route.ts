import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const period = searchParams.get("period");
  const type = searchParams.get("type");

  const evaluations = await prisma.evaluation.findMany({
    where: {
      employee: { role: { notIn: ["admin", "superadmin"] } },
      ...(employeeId ? { employeeId: parseInt(employeeId) } : {}),
      ...(period ? { period } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } },
      evaluator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evaluations);
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const auth = getAuthFromRequest(request);
  const { employeeId, period, manualScore, comments, type } = await request.json();

  if (!employeeId || !period) {
    return NextResponse.json({ error: "الموظف والفترة مطلوبان" }, { status: 400 });
  }

  // Calculate auto scores if auto type
  let attendanceScore = 0;
  let tasksScore = 0;

  if (type === "auto" || !type) {
    const [year, month] = period.split("-");
    const monthStr = `${year}-${month}`;

    // Attendance score
    const attendanceDays = await prisma.attendance.count({
      where: { employeeId: parseInt(employeeId), date: { startsWith: monthStr } },
    });
    const lateDays = await prisma.attendance.count({
      where: { employeeId: parseInt(employeeId), date: { startsWith: monthStr }, status: "late" },
    });
    const workingDays = 22; // average working days per month
    attendanceScore = Math.min(100, (attendanceDays / workingDays) * 100 - lateDays * 2);

    // Tasks score
    const tasksCompleted = await prisma.task.count({
      where: { assignedTo: parseInt(employeeId), status: "completed" },
    });
    const tasksTotal = await prisma.task.count({
      where: { assignedTo: parseInt(employeeId) },
    });
    tasksScore = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;
  }

  const totalScore = manualScore
    ? (attendanceScore * 0.4) + (tasksScore * 0.4) + (manualScore * 0.2)
    : (attendanceScore * 0.5) + (tasksScore * 0.5);

  const evaluation = await prisma.evaluation.create({
    data: {
      employeeId: parseInt(employeeId),
      evaluatorId: auth!.id,
      period,
      attendanceScore: Math.round(attendanceScore),
      tasksScore: Math.round(tasksScore),
      manualScore: manualScore ? parseFloat(manualScore) : null,
      totalScore: Math.round(totalScore),
      comments,
      type: type || "auto",
    },
    include: {
      employee: { select: { name: true } },
      evaluator: { select: { name: true } },
    },
  });

  return NextResponse.json(evaluation);
}
