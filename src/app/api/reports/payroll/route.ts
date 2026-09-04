import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, canAccessFinance } from "@/lib/middleware";
import { generateFormalReportPDF } from "@/lib/pdf-reports";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (!(await canAccessFinance(request))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || new Date().toISOString().substring(0, 7);
  const exportType = searchParams.get("export") || "pdf"; // pdf or excel

  const payrolls = await prisma.payroll.findMany({
    where: { 
      period,
      employee: { role: { notIn: ["admin", "superadmin"] } }
    },
    include: {
      employee: { select: { name: true, basicSalary: true, department: { select: { name: true } } } },
    },
    orderBy: { employeeId: "asc" },
  });

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "Arco Tech HR";

  // Calculate stats
  let totalNet = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  
  payrolls.forEach(pr => {
    totalNet += pr.netSalary;
    totalDeductions += pr.autoDeduction + pr.manualDeduction;
    totalBonuses += pr.bonus;
  });

  const tableData = payrolls.map((pr, index) => [
    index + 1,
    pr.employee?.name || "غير محدد",
    pr.employee?.basicSalary || pr.basicSalary || 0,
    pr.absentDays,
    pr.lateDays,
    pr.bonus.toFixed(2),
    pr.manualDeduction.toFixed(2),
    pr.autoDeduction.toFixed(2),
    pr.netSalary.toFixed(2),
    pr.status === 'paid' ? 'تم الصرف' : 'استحقاق',
  ]);

  if (exportType === "excel") {
    const BOM = "\uFEFF";
    let csvContent = "م,اسم الموظف,الراتب الأساسي,الغياب,التأخير,مكافآت,خصم إداري,خصم غياب,الصافي,الحالة\n";
    tableData.forEach(row => {
      csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    
    return new NextResponse(BOM + csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll_report_${period}.csv"`,
      },
    });
  }

  // Generate PDF
  const pdfBuffer = await generateFormalReportPDF({
    companyName,
    period,
    reportTitle: "المسير المالي الشامل",
    summaryItems: [
      { label: "إجمالي الرواتب الصافية", value: totalNet.toLocaleString('ar-EG') + " ج.م" },
      { label: "إجمالي الخصومات", value: totalDeductions.toLocaleString('ar-EG') + " ج.م" },
      { label: "إجمالي المكافآت", value: totalBonuses.toLocaleString('ar-EG') + " ج.م" },
      { label: "إجمالي الموظفين", value: payrolls.length.toString() },
    ],
    tableHeaders: ["م", "اسم الموظف", "الأساسي", "غياب", "تأخير", "مكافآت", "خصم إداري", "خصم غياب", "الصافي", "الحالة"],
    tableColWidths: [30, 120, 80, 50, 50, 70, 70, 70, 80, 80],
    tableData,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payroll_report_${period}.pdf"`,
    },
  });
}
