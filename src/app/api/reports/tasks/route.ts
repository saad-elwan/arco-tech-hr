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
  const employeeId = searchParams.get("employeeId");

  let whereClause: any = {};

  let employeeName: string | undefined;
  if (employeeId) {
    whereClause.assignedTo = parseInt(employeeId);
    const emp = await prisma.employee.findUnique({ where: { id: parseInt(employeeId) }, select: { name: true } });
    if (emp) employeeName = emp.name;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: { assignee: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "شركتي";

  // Calculate stats
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const newTasks = tasks.filter(t => t.status === "new").length;
  const overdue = tasks.filter(t => t.status === "overdue").length;

  // Build table data
  const tableData = tasks.map((record, index) => [
    index + 1,
    record.title || "",
    record.description || "-",
    record.assignee?.name || "-",
    record.priority,
    record.status,
  ]);

  const pdfBuffer = await generateFormalReportPDF({
    companyName,
    period: new Date().toISOString().substring(0, 7),
    reportTitle: "تقرير المهام المنجزة",
    summaryItems: [
      { label: "إجمالي المهام", value: total.toString(), color: "#3b82f6" },
      { label: "مكتملة", value: completed.toString(), color: "#10b981" },
      { label: "قيد التنفيذ", value: inProgress.toString(), color: "#f59e0b" },
      { label: "جديدة", value: newTasks.toString(), color: "#3b82f6" },
      { label: "متأخرة", value: overdue.toString(), color: "#ef4444" },
    ],
    tableHeaders: ["م", "عنوان المهمة", "الوصف", "المكلف", "الأولوية", "الحالة"],
    tableColWidths: [50, 180, 200, 130, 100, 100],
    tableData,
    statusColumnIndex: 5,
    statusColors: {
      completed: "#10b981",
      in_progress: "#3b82f6",
      new: "#6b7280",
      overdue: "#ef4444",
    },
    statusLabels: {
      completed: "مكتملة",
      in_progress: "قيد التنفيذ",
      new: "جديدة",
      overdue: "متأخرة",
    },
    signatures: ["مدير الموارد البشرية", "المدير المالي", "الختم الرسمي", "المدير العام"],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tasks_report_${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}