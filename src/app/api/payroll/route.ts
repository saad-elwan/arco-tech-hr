import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, canAccessFinance } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period"); // e.g., "2026-04"

  if (!period) return NextResponse.json({ error: "الفترة مطلوبة" }, { status: 400 });

  const payrolls = await prisma.payroll.findMany({
    where: { 
      period,
      employee: { role: { notIn: ["admin", "superadmin"] } }
    },
    include: {
      employee: { select: { name: true, department: { select: { name: true } } } },
    },
    orderBy: { employeeId: "asc" },
  });

  return NextResponse.json(payrolls);
}

// Generate or update payroll for all active non-admin employees for a given month
export async function POST(request: NextRequest) {
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { period } = await request.json(); // e.g., "2026-04"
  if (!period) return NextResponse.json({ error: "الفترة مطلوبة" }, { status: 400 });

  // Get company settings for late threshold & default start time
  const company = await prisma.company.findFirst();
  const defaultStartTime = company?.workStartTime || "08:00";
  const defaultEndTime = company?.workEndTime || "17:00";
  const lateThreshold = company?.lateThresholdMin || 15;

  const employees = await prisma.employee.findMany({
    where: { 
      status: "active",
      role: { notIn: ["admin", "superadmin"] }
    },
    include: { shift: true }
  });

  const generatedPayrolls = [];

  for (const emp of employees) {
    const basicSalary = emp.basicSalary || 0;
    const dayWage = basicSalary / 30; // standard 30 day divisor

    // Determine shift hours and start time
    const startTime = emp.shift?.startTime || defaultStartTime;
    const endTime = emp.shift?.endTime || defaultEndTime;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const shiftMinutes = Math.max(60, (eh * 60 + em) - (sh * 60 + sm));
    const shiftHours = shiftMinutes / 60;
    const hourlyWage = dayWage / (shiftHours || 8);

    // Fetch attendance records for this month
    const records = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { startsWith: period } },
    });

    const presentDays = records.filter(r => r.status === "present" || r.checkIn).length;
    const lateRecords = records.filter(r => r.status === "late" || (r.checkIn && r.checkIn > startTime));
    const lateDays = lateRecords.length;
    const absentDays = records.filter(r => r.status === "absent").length;

    // Calculate total late minutes
    let totalLateMinutes = 0;
    for (const r of lateRecords) {
      if (r.checkIn) {
        const [ch, cm] = r.checkIn.split(":").map(Number);
        const checkInMin = ch * 60 + cm;
        const startMin = sh * 60 + sm + lateThreshold;
        if (checkInMin > startMin) {
          totalLateMinutes += (checkInMin - (sh * 60 + sm));
        }
      }
    }

    // Deduction: Absent days + late hours deduction
    const absentDeduction = absentDays * dayWage;
    const lateDeduction = (totalLateMinutes / 60) * hourlyWage;
    const autoDeduction = parseFloat((absentDeduction + lateDeduction).toFixed(2));
    
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
        generatedPayrolls.push(existing);
        continue;
      }
      prevBonus = existing.bonus;
      prevManualDeduction = existing.manualDeduction;
      prevStatus = existing.status;
      prevNotes = existing.notes || "";
    }

    const netSalary = Math.max(0, parseFloat((basicSalary - autoDeduction + prevBonus - prevManualDeduction).toFixed(2)));

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

// Update or Upsert single payroll (for manual bonuses/deductions/status changes)
export async function PUT(request: NextRequest) {
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

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
  
  const finalAutoDeduction = existing?.autoDeduction || 0;
  const netSalary = Math.max(0, parseFloat((finalBasicSalary - finalAutoDeduction + finalBonus - finalManualDeduction).toFixed(2)));

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

  // If status transitioned to "paid", record in Treasury
  if (payrollData.status === "paid" && existing?.status !== "paid") {
    try {
      const treasury = await prisma.treasury.findUnique({ where: { id: 1 } });
      if (treasury) {
        await prisma.treasury.update({
          where: { id: 1 },
          data: {
            balance: treasury.balance - netSalary,
            totalWithdrawals: treasury.totalWithdrawals + netSalary,
          }
        });
      }
      await prisma.treasuryTransaction.create({
        data: {
          type: "salary_payment",
          amount: netSalary,
          description: `صرف راتب شهر ${period || updated.period} للموظف: ${updated.employee?.name}`,
          referenceId: `payroll_${updated.id}`,
          performedBy: "الإدارة المالية",
        }
      });
    } catch (treasuryErr) {
      console.error("Treasury record error:", treasuryErr);
    }

    // Send notification
    const parts: string[] = [];
    if (payrollData.bonus > 0) parts.push(`مكافأة: ${payrollData.bonus} ج.م`);
    if (payrollData.autoDeduction > 0) parts.push(`خصومات: ${payrollData.autoDeduction} ج.م`);
    await createNotification({
      employeeId: updated.employeeId,
      type: "success",
      category: "payroll",
      title: `💰 تم صرف راتب شهر ${period || updated.period}`,
      body: `صافي الراتب المصروف: ${netSalary.toLocaleString("ar-EG")} ج.م${parts.length > 0 ? " — " + parts.join(" | ") : ""}`,
      link: "/me",
    });
  }

  return NextResponse.json(updated);
}
