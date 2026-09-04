import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintClient from "./PrintClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'تقرير الرواتب',
};

export default async function PayrollPrintPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period || new Date().toISOString().substring(0, 7);

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

  if (!payrolls || payrolls.length === 0) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        <h2>لا توجد بيانات رواتب لهذه الفترة</h2>
      </div>
    );
  }

  const company = await prisma.company.findFirst();
  const companyName = company?.name || "Arco Tech HR";

  let totalNet = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  
  payrolls.forEach(pr => {
    totalNet += pr.netSalary;
    totalDeductions += pr.autoDeduction + pr.manualDeduction;
    totalBonuses += pr.bonus;
  });

  return (
    <PrintClient 
      payrolls={payrolls}
      period={period}
      companyName={companyName}
      totalNet={totalNet}
      totalDeductions={totalDeductions}
      totalBonuses={totalBonuses}
    />
  );
}
