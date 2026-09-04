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
      employee: { select: { name: true, basicSalary: true, department: { select: { name: true } } } },
    },
    orderBy: { employeeId: "asc" },
  });

  // Calculate attended hours and late hours dynamically
  const attendances = await prisma.attendance.findMany({
    where: { date: { startsWith: period } }
  });

  const company = await prisma.company.findFirst();
  const defaultStartTime = company?.workStartTime || "08:00";
  const defaultEndTime = company?.workEndTime || "17:00";
  const lateThreshold = company?.lateThresholdMin || 15;
  
  const payrollsWithHours = payrolls.map(pr => {
    const empRecords = attendances.filter(a => a.employeeId === pr.employeeId);
    let totalWorkedMinutes = 0;
    let totalLateMinutes = 0;
    
    // Fallback to default if no shift
    const startStr = defaultStartTime; // Should ideally come from pr.employee.shift if included
    const [sh, sm] = startStr.split(':').map(Number);
    const graceEndMinutes = (sh * 60 + sm) + lateThreshold;
    
    empRecords.forEach(r => {
      let checkInMin = 0;
      if (r.checkIn) {
        const [h, m] = r.checkIn.split(':').map(Number);
        checkInMin = h * 60 + m;
        if (checkInMin > graceEndMinutes) {
          totalLateMinutes += (checkInMin - graceEndMinutes);
        }
      }
      
      if (r.checkIn && r.checkOut) {
        const [outH, outM] = r.checkOut.split(':').map(Number);
        const outMin = outH * 60 + outM;
        if (outMin > checkInMin) {
          totalWorkedMinutes += (outMin - checkInMin);
        }
      }
    });

    return {
      ...pr,
      attendedHours: (totalWorkedMinutes / 60).toFixed(1),
      lateHours: (totalLateMinutes / 60).toFixed(1),
    };
  });

  return NextResponse.json(payrollsWithHours);
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
    const startStr = emp.shift?.startTime || defaultStartTime;
    const endStr = emp.shift?.endTime || defaultEndTime;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    
    const workStartMinutes = sh * 60 + sm;
    const workEndMinutes = eh * 60 + em;
    const dailyWorkHours = (workEndMinutes - workStartMinutes) / 60;
    const graceEndMinutes = workStartMinutes + lateThreshold;
    
    const minuteWage = dayWage / (dailyWorkHours * 60);

    const currentMonth = new Date().toISOString().substring(0, 7);
    const today = new Date().getDate();
    // Calculate elapsed days for mid-month calculation of absences
    const elapsedDays = period === currentMonth ? Math.min(30, today) : 30;
    
    // The basic salary shown in the payroll should be the FULL fixed salary.
    // Deductions are subtracted from it based on absences up to today.
    const earnedBasicSalary = basicSalary;

    // Fetch attendance records for this month
    const records = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { startsWith: period } },
    });

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    
    let totalLateMinutes = 0;
    let totalPenalizedMinutes = 0;
    let totalUnfulfilledMinutes = 0;
    let totalWorkedMinutes = 0;

    for (let day = 1; day <= elapsedDays; day++) {
      const dateStr = `${period}-${String(day).padStart(2, '0')}`;
      const r = records.find(record => record.date === dateStr);

      if (!r) {
        // No record at all = absent
        absentDays++;
        continue;
      }

      if (r.status === "leave" || r.status === "holiday") {
        // Paid leave or holiday
        presentDays++;
        continue;
      }

      if (r.status === "absent") {
        absentDays++;
        continue;
      }

      if (r.checkIn) {
        presentDays++;
        const [ch, cm] = r.checkIn.split(":").map(Number);
        const checkInMin = ch * 60 + cm;
        
        // Late calculation
        if (checkInMin > graceEndMinutes) {
          lateDays++;
          const delay = checkInMin - graceEndMinutes;
          const penalized = delay * 2; // 1 min late = 2 min deduction
          totalLateMinutes += delay;
          totalPenalizedMinutes += penalized;
        }

        // Unfulfilled hours (early checkout)
        if (r.checkOut) {
          const [outH, outM] = r.checkOut.split(":").map(Number);
          const outMin = outH * 60 + outM;
          const workedMins = outMin - checkInMin;
          if (workedMins > 0) {
            totalWorkedMinutes += workedMins;
          }
          
          const expectedMins = dailyWorkHours * 60;
          if (workedMins < expectedMins) {
            totalUnfulfilledMinutes += (expectedMins - workedMins);
          }
        } else {
          // No checkout = didn't fulfill the rest of the day after check-in
          const expectedMins = dailyWorkHours * 60;
          totalUnfulfilledMinutes += (expectedMins / 2);
        }
      } else {
        // Record exists (maybe default status="present"), but NO checkIn = ABSENT
        absentDays++;
      }
    }

    // Deduction: Absent days + late penalty + unfulfilled hours
    const absentDeduction = absentDays * dayWage;
    const lateDeduction = totalPenalizedMinutes * minuteWage;
    const unfulfilledDeduction = totalUnfulfilledMinutes * minuteWage;
    const autoDeduction = parseFloat((absentDeduction + lateDeduction + unfulfilledDeduction).toFixed(2));
    
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

    const netSalary = Math.max(0, parseFloat((earnedBasicSalary - autoDeduction + prevBonus - prevManualDeduction).toFixed(2)));

    const attendedHours = parseFloat((totalWorkedMinutes / 60).toFixed(2));
    const lateHours = parseFloat((totalLateMinutes / 60).toFixed(2));

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_period: { employeeId: emp.id, period } },
      update: {
        basicSalary: earnedBasicSalary, // Show the pro-rata basic salary dynamically
        presentDays,
        lateDays,
        absentDays,
        attendedHours,
        lateHours,
        autoDeduction,
        netSalary,
      },
      create: {
        employeeId: emp.id,
        period,
        basicSalary: earnedBasicSalary, // Show the pro-rata basic salary dynamically
        presentDays,
        lateDays,
        absentDays,
        attendedHours,
        lateHours,
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
// Bulk approve payrolls
export async function PATCH(request: NextRequest) {
  if (!(await canAccessFinance(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { period, action } = await request.json();
  if (!period || action !== "approve_all") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  // Get all drafts for this period
  const drafts = await prisma.payroll.findMany({
    where: { period, status: "draft" },
    include: { employee: true }
  });

  if (drafts.length === 0) {
    return NextResponse.json({ success: true, count: 0, message: "لا يوجد رواتب مسودة" });
  }

  let totalNetSalary = 0;
  for (const draft of drafts) {
    totalNetSalary += draft.netSalary;
  }

  // Update all to paid
  await prisma.payroll.updateMany({
    where: { period, status: "draft" },
    data: { status: "paid" }
  });

  // Record in treasury
  try {
    const treasury = await prisma.treasury.findUnique({ where: { id: 1 } });
    if (treasury) {
      await prisma.treasury.update({
        where: { id: 1 },
        data: {
          balance: treasury.balance - totalNetSalary,
          totalWithdrawals: treasury.totalWithdrawals + totalNetSalary,
        }
      });
    }
    await prisma.treasuryTransaction.create({
      data: {
        type: "salary_payment",
        amount: totalNetSalary,
        description: `صرف جماعي لرواتب شهر ${period} لعدد ${drafts.length} موظف`,
        referenceId: `payroll_bulk_${period}`,
        performedBy: "الإدارة المالية",
      }
    });
  } catch (treasuryErr) {
    console.error("Treasury record error:", treasuryErr);
  }

  // Send notifications to all
  for (const draft of drafts) {
    const parts: string[] = [];
    if (draft.bonus > 0) parts.push(`مكافأة: ${draft.bonus} ج.م`);
    if (draft.autoDeduction > 0) parts.push(`خصومات: ${draft.autoDeduction} ج.م`);
    await createNotification({
      employeeId: draft.employeeId,
      type: "success",
      category: "payroll",
      title: `💰 تم صرف راتب شهر ${period}`,
      body: `صافي الراتب المصروف: ${draft.netSalary.toLocaleString("ar-EG")} ج.م${parts.length > 0 ? " — " + parts.join(" | ") : ""}`,
      link: "/me",
    });
  }

  return NextResponse.json({ success: true, count: drafts.length, totalPaid: totalNetSalary });
}
