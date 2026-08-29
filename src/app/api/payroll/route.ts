import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!isHROrAdmin(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period"); // e.g., "2026-04"

  if (!period) return NextResponse.json({ error: "الفترة مطلوبة" }, { status: 400 });

  const payrolls = await prisma.payroll.findMany({
    where: { period },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } },
    },
    orderBy: { employeeId: "asc" },
  });

  return NextResponse.json(payrolls);
}

// Generate or update payroll for all active employees for a given month
export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { period } = await request.json(); // e.g., "2026-04"
  if (!period) return NextResponse.json({ error: "الفترة مطلوبة" }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { status: "active" },
  });

  const generatedPayrolls = [];

  for (const emp of employees) {
    const basicSalary = emp.basicSalary || 0;
    const dayWage = basicSalary / 30; // standard 30 day divisor

    // Fetch attendance records for this month
    const records = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { startsWith: period } },
    });

    const presentDays = records.filter(r => r.status === "present" || r.checkIn).length;
    const lateDays = records.filter(r => r.status === "late").length;
    const absentDays = records.filter(r => r.status === "absent").length;

    // Standard rule: 1 absent = 1 day wage deducted. No auto-deduction for late by default, can be added manually.
    const autoDeduction = absentDays * dayWage;
    
    // Default manual values
    let prevBonus = 0;
    let prevManualDeduction = 0;
    let prevStatus = "draft";
    let prevNotes = "";

    // Check if payroll already exists to preserve manual values
    const existing = await prisma.payroll.findUnique({
      where: { employeeId_period: { employeeId: emp.id, period } }
    });

    if (existing) {
      if (existing.status === "paid") {
        // Skip updating paid payrolls
        generatedPayrolls.push(existing);
        continue;
      }
      prevBonus = existing.bonus;
      prevManualDeduction = existing.manualDeduction;
      prevStatus = existing.status;
      prevNotes = existing.notes || "";
    }

    const netSalary = Math.max(0, basicSalary - autoDeduction + prevBonus - prevManualDeduction);

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_period: { employeeId: emp.id, period } },
      update: {
        basicSalary,
        presentDays,
        lateDays,
        absentDays,
        autoDeduction,
        netSalary,
      },
      create: {
        employeeId: emp.id,
        period,
        basicSalary,
        presentDays,
        lateDays,
        absentDays,
        autoDeduction,
        bonus: prevBonus,
        manualDeduction: prevManualDeduction,
        netSalary,
        status: prevStatus,
        notes: prevNotes,
      },
      include: { employee: { select: { name: true, department: { select: { name: true } } } } }
    });

    generatedPayrolls.push(payroll);
  }

  return NextResponse.json({ success: true, count: generatedPayrolls.length, payrolls: generatedPayrolls });
}

// Update or Upsert single payroll (for manual bonuses/deductions)
export async function PUT(request: NextRequest) {
  if (!isHROrAdmin(request)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id, employeeId, period, basicSalary, bonus: inputBonus, manualDeduction, status, notes } = await request.json();
  
  if (!id && !(employeeId && period)) return NextResponse.json({ error: "معرف السجل أو بيانات الموظف والشهر مطلوبة" }, { status: 400 });

  let existing = null;
  if (id) {
    existing = await prisma.payroll.findUnique({ where: { id: parseInt(id) } });
  } else {
    existing = await prisma.payroll.findUnique({ where: { employeeId_period: { employeeId, period } } });
  }

  let finalBasicSalary = basicSalary !== undefined && basicSalary !== "" ? parseFloat(basicSalary) : 0;
  
  if (existing) {
    if (basicSalary === undefined || basicSalary === "") {
      finalBasicSalary = existing.basicSalary;
    } else {
      await prisma.employee.update({ where: { id: existing.employeeId }, data: { basicSalary: finalBasicSalary } });
    }
  } else if (employeeId) {
    if (finalBasicSalary) {
       await prisma.employee.update({ where: { id: employeeId }, data: { basicSalary: finalBasicSalary } });
    } else {
       const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
       finalBasicSalary = emp?.basicSalary || 0;
    }
  }

  const finalBonus = inputBonus !== undefined && inputBonus !== "" ? parseFloat(inputBonus) : (existing?.bonus || 0);
  const finalManualDeduction = manualDeduction !== undefined && manualDeduction !== "" ? parseFloat(manualDeduction) : (existing?.manualDeduction || 0);
  
  const dayWage = finalBasicSalary / 30;
  const absentDays = existing?.absentDays || 0;
  const finalAutoDeduction = absentDays * dayWage;

  const netSalary = Math.max(0, finalBasicSalary - finalAutoDeduction + finalBonus - finalManualDeduction);

  const statusValue = status !== undefined ? status : (existing?.status || 'draft');
  const notesValue = notes !== undefined ? notes : (existing?.notes || '');

  const payrollData = {
    basicSalary: finalBasicSalary,
    autoDeduction: finalAutoDeduction,
    bonus: finalBonus,
    manualDeduction: finalManualDeduction,
    netSalary,
    status: statusValue,
    notes: notesValue,
  };

  let updated;
  if (id || existing?.id) {
    updated = await prisma.payroll.update({
      where: { id: id ? parseInt(id) : existing!.id },
      data: payrollData,
      include: { employee: { select: { name: true, department: { select: { name: true } } } } }
    });
  } else {
    updated = await prisma.payroll.create({
      data: {
        employeeId,
        period,
        absentDays: 0,
        lateDays: 0,
        ...payrollData
      },
      include: { employee: { select: { name: true, department: { select: { name: true } } } } }
    });
  }

  // Notify employee about their payroll
  const parts: string[] = [];
  if (payrollData.bonus > 0) parts.push(`مكافأة: ${payrollData.bonus} ج.م`);
  if (payrollData.autoDeduction > 0) parts.push(`خصومات: ${payrollData.autoDeduction} ج.م`);
  await createNotification({
    employeeId: updated.employeeId,
    type: "success",
    category: "payroll",
    title: `💰 تم صرف راتب شهر ${period}`,
    body: `صافي الراتب: ${payrollData.netSalary.toLocaleString("ar-EG")} ج.م${parts.length > 0 ? " — " + parts.join(" | ") : ""}`,
    link: "/me",
  });

  return NextResponse.json(updated);
}
