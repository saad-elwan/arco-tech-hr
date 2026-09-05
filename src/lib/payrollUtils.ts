import { prisma } from "@/lib/prisma";

/**
 * Synchronize a single employee's payroll for a given period.
 * Called after every check-in / check-out so the payslip is always up-to-date.
 *
 * This function:
 * 1. Fetches the employee's shift & company settings.
 * 2. Iterates over every day in the period (up to today for the current month).
 * 3. Computes present/absent/late days, worked minutes, late minutes, unfulfilled minutes.
 * 4. Upserts the Payroll row while preserving any manual bonus / deduction / status.
 */
export async function syncEmployeePayroll(employeeId: number, period: string) {
  try {
    const company = await prisma.company.findFirst();
    const defaultStartTime = company?.workStartTime || "08:00";
    const defaultEndTime = company?.workEndTime || "17:00";
    const lateThreshold = company?.lateThresholdMin || 15;

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!emp || emp.role === "admin" || emp.role === "superadmin") return null;

    const basicSalary = emp.basicSalary || 0;
    const dayWage = basicSalary / 30;
    const startStr = emp.shift?.startTime || defaultStartTime;
    const endStr = emp.shift?.endTime || defaultEndTime;
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);

    const workStartMinutes = sh * 60 + sm;
    const workEndMinutes = eh * 60 + em;
    const dailyWorkHours = (workEndMinutes - workStartMinutes) / 60;
    const graceEndMinutes = workStartMinutes + lateThreshold;
    const minuteWage = dayWage / (dailyWorkHours * 60);

    // Figure out how many days to loop over
    const currentMonth = new Date().toISOString().substring(0, 7);
    const today = new Date().getDate();
    const elapsedDays = period === currentMonth ? Math.min(30, today) : 30;

    // Fetch all attendance records for this employee in this period
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
      const dateStr = `${period}-${String(day).padStart(2, "0")}`;
      const r = records.find((record) => record.date === dateStr);

      if (!r) {
        absentDays++;
        continue;
      }

      if (r.status === "leave" || r.status === "holiday") {
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

        // Worked / unfulfilled hours
        if (r.checkOut) {
          const [outH, outM] = r.checkOut.split(":").map(Number);
          const outMin = outH * 60 + outM;
          const workedMins = outMin - checkInMin;
          if (workedMins > 0) {
            totalWorkedMinutes += workedMins;
          }
          const expectedMins = dailyWorkHours * 60;
          if (workedMins < expectedMins) {
            totalUnfulfilledMinutes += expectedMins - workedMins;
          }
        } else {
          // No checkout yet – penalize half the day
          const expectedMins = dailyWorkHours * 60;
          totalUnfulfilledMinutes += expectedMins / 2;
        }
      } else {
        // Record exists but NO checkIn → absent
        absentDays++;
      }
    }

    // Deductions
    const absentDeduction = absentDays * dayWage;
    const lateDeduction = totalPenalizedMinutes * minuteWage;
    const unfulfilledDeduction = totalUnfulfilledMinutes * minuteWage;
    const autoDeduction = parseFloat(
      (absentDeduction + lateDeduction + unfulfilledDeduction).toFixed(2)
    );

    const proRataBasic = (basicSalary / 30) * elapsedDays;

    // Preserve existing manual values if payroll already exists
    let prevBonus = 0;
    let prevManualDeduction = 0;
    let prevStatus = "draft";
    let prevNotes = "";

    const existing = await prisma.payroll.findUnique({
      where: { employeeId_period: { employeeId: emp.id, period } },
    });

    if (existing) {
      if (existing.status === "paid") {
        // Don't touch paid payrolls
        return existing;
      }
      prevBonus = existing.bonus;
      prevManualDeduction = existing.manualDeduction;
      prevStatus = existing.status;
      prevNotes = existing.notes || "";
    }

    const netSalary = Math.max(
      0,
      parseFloat(
        (proRataBasic - autoDeduction + prevBonus - prevManualDeduction).toFixed(2)
      )
    );

    const attendedHours = parseFloat((totalWorkedMinutes / 60).toFixed(2));
    const lateHours = parseFloat((totalLateMinutes / 60).toFixed(2));

    const payroll = await prisma.payroll.upsert({
      where: { employeeId_period: { employeeId: emp.id, period } },
      update: {
        basicSalary,
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
        basicSalary,
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
    });

    return payroll;
  } catch (err) {
    console.error(`[syncEmployeePayroll] Error for employee ${employeeId}:`, err);
    return null;
  }
}
