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
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");

  let whereClause: any = {};

  if (status) {
    whereClause.status = status;
  }

  let departmentName: string | undefined;
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
    if (dept) {
      departmentName = dept.name;
      whereClause.departmentId = parseInt(departmentId);
    }
  }

  const employees = await prisma.employee.findMany({
    where: whereClause,
    include: { department: true, shift: true },
    orderBy: [{ name: "asc" }],
  });

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "شركتي";

  // Calculate stats
  const total = employees.length;
  const active = employees.filter(e => e.status === "active").length;
  const leave = employees.filter(e => e.status === "leave").length;
  const inactive = employees.filter(e => e.status === "inactive").length;

  // Build table data
  const tableData = employees.map((record, index) => [
    index + 1,
    record.name || "",
    record.email || "-",
    record.department?.name || "-",
    record.shift?.name || "-",
    record.hireDate ? new Date(record.hireDate).toLocaleDateString("ar-EG") : "-",
    `${record.basicSalary?.toLocaleString("ar-EG") || 0} ج.م`,
    record.status,
  ]);

  const pdfBuffer = await generateFormalReportPDF({
    companyName,
    departmentName,
    period: new Date().toISOString().substring(0, 7),
    reportTitle: "تقرير بيانات الموظفين",
    summaryItems: [
      { label: "إجمالي الموظفين", value: total.toString(), color: "#3b82f6" },
      { label: "نشط", value: active.toString(), color: "#10b981" },
      { label: "إجازة", value: leave.toString(), color: "#f59e0b" },
      { label: "غير نشط", value: inactive.toString(), color: "#ef4444" },
    ],
    tableHeaders: ["م", "الاسم", "البريد الإلكتروني", "القسم", "الوردية", "تاريخ التعيين", "الراتب الأساسي", "الحالة"],
    tableColWidths: [50, 130, 150, 110, 100, 100, 110, 80],
    tableData,
    statusColumnIndex: 7,
    statusColors: {
      active: "#10b981",
      leave: "#f59e0b",
      inactive: "#ef4444",
    },
    statusLabels: {
      active: "نشط",
      leave: "إجازة",
      inactive: "غير نشط",
    },
    signatures: ["مدير الموارد البشرية", "المدير المالي", "الختم الرسمي", "المدير العام"],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="employees_report_${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}