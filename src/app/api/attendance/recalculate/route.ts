import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const cairoTimeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false
    });
    
    const parts = cairoTimeFormatter.formatToParts(now);
    let year = "", month = "", day = "";
    for (const p of parts) {
      if (p.type === "year") year = p.value;
      if (p.type === "month") month = p.value;
      if (p.type === "day") day = p.value;
    }
    const today = `${year}-${month}-${day}`;

    // New Rule:
    // Work starts 08:30 AM
    // Grace period ends 08:45 AM (525 minutes)
    // Delay deduction = 2x minutes
    const GRACE_END_MINUTES = 8 * 60 + 45; // 525 (08:45 AM)

    const records = await prisma.attendance.findMany({
      where: { date: today },
      include: { employee: { select: { name: true } } }
    });

    const updated = [];

    for (const r of records) {
      if (r.checkIn) {
        const [h, m] = r.checkIn.split(":").map(Number);
        const totalMinutes = h * 60 + m;

        let status = "present";
        let notes = "";

        if (totalMinutes <= GRACE_END_MINUTES) {
          status = "present";
          notes = "حضور في الموعد (فترة السماح حتى 08:45)";
        } else {
          status = "late";
          const delayMinutes = totalMinutes - GRACE_END_MINUTES;
          const penalizedMinutes = delayMinutes * 2; // الدقيقة بدقيقتين
          notes = `تأخير ${delayMinutes} دقيقة بعد 08:45 (يُخصم ${penalizedMinutes} دقيقة)`;
        }

        const res = await prisma.attendance.update({
          where: { id: r.id },
          data: {
            status,
            notes,
          }
        });

        updated.push({
          employee: r.employee?.name || r.employeeId,
          checkIn: r.checkIn,
          status,
          notes,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إعادة احتساب الحضور بنجاح لجميع موظفي اليوم (${today})`,
      date: today,
      recordsCount: updated.length,
      updated,
    });
  } catch (error: any) {
    console.error("Recalculate error:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ" }, { status: 500 });
  }
}
