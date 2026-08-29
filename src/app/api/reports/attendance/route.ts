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
  const month = searchParams.get("month");
  const employeeId = searchParams.get("employeeId");
  const departmentId = searchParams.get("departmentId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!month && !fromDate) {
    return NextResponse.json({ error: "يجب تحديد الشهر أو نطاق التواريخ" }, { status: 400 });
  }

  let whereClause: any = {};

  if (month) {
    whereClause.date = { startsWith: month };
  } else if (fromDate && toDate) {
    whereClause.date = {
      gte: fromDate,
      lte: toDate,
    };
  }

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

  let employeeName: string | undefined;
  if (employeeId) {
    const emp = await prisma.employee.findUnique({ where: { id: parseInt(employeeId) }, select: { name: true } });
    if (emp) employeeName = emp.name;
  }

  const attendance = await prisma.attendance.findMany({
    where: whereClause,
    include: { employee: { include: { department: true } } },
    orderBy: [{ date: "desc" }, { employee: { name: "asc" } }],
  });

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "شركتي";

  const monthStr = month || fromDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);
  const period = monthStr;

  // Calculate stats
  const stats = {
    total: attendance.length,
    present: attendance.filter((r) => r.status === "present").length,
    late: attendance.filter((r) => r.status === "late").length,
    absent: attendance.filter((r) => r.status === "absent").length,
  };

  // Build table data
  const tableData = attendance.map((record, index) => [
    index + 1,
    record.employee?.name || "",
    record.employee?.department?.name || "",
    record.date,
    record.checkIn || "---",
    record.checkOut || "---",
    record.status,
  ]);

  const pdfBuffer = await generateFormalReportPDF({
    companyName,
    departmentName,
    period,
    reportTitle: "تقرير الحضور والانصراف",
    summaryItems: [
      { label: "إجمالي السجلات", value: stats.total.toString(), color: "#3b82f6" },
      { label: "حاضر", value: stats.present.toString(), color: "#10b981" },
      { label: "متأخر", value: stats.late.toString(), color: "#f59e0b" },
      { label: "غائب", value: stats.absent.toString(), color: "#ef4444" },
    ],
    tableHeaders: ["م", "اسم الموظف", "القسم", "التاريخ", "وقت الحضور", "وقت الانصراف", "الحالة"],
    tableColWidths: [50, 150, 130, 110, 110, 110, 100],
    tableData,
    statusColumnIndex: 6,
    statusColors: {
      present: "#10b981",
      late: "#f59e0b",
      absent: "#ef4444",
    },
    statusLabels: {
      present: "حاضر",
      late: "متأخر",
      absent: "غائب",
    },
    signatures: ["مدير الموارد البشرية", "المدير المالي", "الختم الرسمي", "المدير العام"],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance_report_${period}.pdf"`,
    },
  });
}