import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { generateFormalReportPDF } from "@/lib/pdf-reports";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const employeeId = searchParams.get("employeeId");
  const departmentId = searchParams.get("departmentId");

  if (!period) {
    return NextResponse.json({ error: "الفترة مطلوبة" }, { status: 400 });
  }

  let whereClause: any = { period };

  if (employeeId) {
    whereClause.employeeId = parseInt(employeeId);
  }

  let departmentName: string | undefined;
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
    if (dept) {
      departmentName = dept.name;
      const deptEmployees = await prisma.employee.findMany({ where: { departmentId: parseInt(departmentId) }, select: { id: true } });
      whereClause.employeeId = { in: deptEmployees.map((e) => e.id) };
    }
  }

  const evaluations = await prisma.evaluation.findMany({
    where: whereClause,
    include: { employee: { include: { department: true } } },
    orderBy: [{ totalScore: "desc" }, { employee: { name: "asc" } }],
  });

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "شركتي";

  // Calculate stats
  const totalEvals = evaluations.length;
  const avgTotal = totalEvals > 0 ? evaluations.reduce((sum, e) => sum + (e.totalScore || 0), 0) / totalEvals : 0;
  const avgTasks = totalEvals > 0 ? evaluations.reduce((sum, e) => sum + (e.tasksScore || 0), 0) / totalEvals : 0;
  const avgAttendance = totalEvals > 0 ? evaluations.reduce((sum, e) => sum + (e.attendanceScore || 0), 0) / totalEvals : 0;

  // Build table data
  const tableData = evaluations.map((evalRecord, index) => [
    index + 1,
    evalRecord.employee?.name || "",
    evalRecord.employee?.department?.name || "-",
    `${evalRecord.totalScore || 0}%`,
    `${evalRecord.attendanceScore || 0}%`,
    `${evalRecord.tasksScore || 0}%`,
    evalRecord.manualScore !== null && evalRecord.manualScore !== undefined ? `${evalRecord.manualScore}%` : "-",
  ]);

  const pdfBuffer = await generateFormalReportPDF({
    companyName,
    departmentName,
    period,
    reportTitle: "التقرير الشهري الشامل لتقييم أداء الموظفين",
    summaryItems: [
      { label: "متوسط التقييم العام", value: `${avgTotal.toFixed(1)}%`, color: "#d4af37" },
      { label: "متوسط أداء المهام", value: `${avgTasks.toFixed(1)}%`, color: "#3b82f6" },
      { label: "متوسط انضباط الحضور", value: `${avgAttendance.toFixed(1)}%`, color: "#10b981" },
      { label: "إجمالي التقييمات", value: `${totalEvals} موظف`, color: "#ef4444" },
    ],
    tableHeaders: ["م", "اسم الموظف", "القسم", "التقييم العام", "الحضور (40%)", "المهام (40%)", "إداري (20%)"],
    tableColWidths: [50, 150, 130, 110, 110, 110, 100],
    tableData,
    statusColumnIndex: -1,
    signatures: ["مدير الموارد البشرية", "الختم الرسمي", "المدير العام"],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="evaluations_report_${period}.pdf"`,
    },
  });
}