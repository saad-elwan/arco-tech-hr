import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding salaries...");
  const employees = await prisma.employee.findMany();
  
  if (employees.length === 0) {
    console.log("No employees found. Seed employees first!");
    return;
  }

  const period = new Date().toISOString().substring(0, 7);

  for (const emp of employees) {
    const base = Math.floor(Math.random() * 22) * 500 + 4000;
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: { basicSalary: base }
    });

    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        employeeId: emp.id,
        date: { startsWith: period }
      },
      _count: true
    });

    let absentDays = 0;
    let lateDays = 0;
    stats.forEach((s: any) => {
      if (s.status === 'الغياب') absentDays += s._count;
      if (s.status === 'تأخير') lateDays += s._count;
    });

    const dailyRate = base / 30;
    const autoDeduction = (absentDays * dailyRate) + (lateDays * (dailyRate * 0.25));

    const bonus = Math.random() > 0.5 ? Math.floor(Math.random() * 4) * 500 + 500 : 0;
    const manualDeduction = Math.random() > 0.8 ? Math.floor(Math.random() * 3) * 100 + 100 : 0;

    const netSalary = base + bonus - autoDeduction - manualDeduction;

    await prisma.payroll.upsert({
      where: {
        employeeId_period: {
          employeeId: emp.id,
          period: period
        }
      },
      update: {
        basicSalary: base,
        absentDays,
        lateDays,
        autoDeduction,
        manualDeduction,
        bonus,
        netSalary,
        status: 'draft'
      },
      create: {
        employeeId: emp.id,
        period: period,
        basicSalary: base,
        absentDays,
        lateDays,
        autoDeduction,
        manualDeduction,
        bonus,
        netSalary,
        status: 'draft'
      }
    });
  }
  
  console.log("Salaries and deductions successfully seeded!");
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
