import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";
import { createAdminNotification } from "@/lib/notifications";

function getCairoTime(): { dateStr: string; timeStr: string; totalMinutes: number; hour: number; minute: number } {
  const now = new Date();
  const cairoTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  
  const parts = cairoTimeFormatter.formatToParts(now);
  let year = "", month = "", day = "", hour = "0", minute = "0";
  for (const p of parts) {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
  }
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    totalMinutes: h * 60 + m,
    hour: h,
    minute: m
  };
}

// POST /api/attendance/checkin → employee self check-in/out
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { latitude, longitude, accuracy, type } = body; // type: "in" | "out"

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "بيانات الموقع GPS مطلوبة" }, { status: 400 });
  }

  // Get company geofence settings
  const company = await prisma.company.findFirst();
  if (company?.geofenceLat && company?.geofenceLng) {
    const dist = getDistance(latitude, longitude, company.geofenceLat, company.geofenceLng);
    // Company radius with minimum 20 meters + GPS accuracy bonus up to 15m to account for indoor drift
    const baseRadius = Math.max(company.geofenceRadius || 20, 20);
    const accuracyBonus = Math.min(accuracy ? parseFloat(accuracy) : 0, 15);
    const allowedDist = baseRadius + accuracyBonus;

    if (dist > allowedDist) {
      return NextResponse.json({
        error: `أنت خارج نطاق الشركة (${Math.round(dist)} متر). يجب أن تكون داخل نطاق المقر لتسجيل ${type === "in" ? "الحضور" : "الانصراف"}.`
      }, { status: 400 });
    }
  }

  const cairo = getCairoTime();
  const today = cairo.dateStr;
  const timeStr = cairo.timeStr;

  // Work schedule rules:
  // Work starts: 08:30 AM (510 minutes)
  // Grace period: 30 minutes until 09:00 AM (540 minutes)
  const WORK_START_MINUTES = 8 * 60 + 30; // 510
  const GRACE_END_MINUTES = 9 * 60 + 0;   // 540

  if (type === "in") {
    // 1. Prevent check-in before 08:30 AM
    if (cairo.totalMinutes < WORK_START_MINUTES) {
      return NextResponse.json({
        error: `غير مسموح بتسجيل الحضور قبل الساعة 08:30 صباحاً (بداية موعد العمل الرسمي). الوقت الحالي: ${timeStr}`
      }, { status: 400 });
    }
  }

  // Determine status & late penalty
  let status = "present";
  let attendanceNote = "";
  if (type === "in") {
    if (cairo.totalMinutes <= GRACE_END_MINUTES) {
      status = "present";
      attendanceNote = "حضور في الموعد (فترة السماح)";
    } else {
      status = "late";
      const delayMinutes = cairo.totalMinutes - GRACE_END_MINUTES;
      const penalizedMinutes = delayMinutes * 2; // الدقيقة بدقيقتين
      attendanceNote = `تأخير ${delayMinutes} دقيقة بعد فترة السماح (يُخصم ${penalizedMinutes} دقيقة)`;
    }
  }

  // Upsert attendance record
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: auth.id, date: today } }
  });

  if (type === "in") {
    if (existing?.checkIn) {
      return NextResponse.json({ error: "تم تسجيل حضورك بالفعل اليوم" }, { status: 400 });
    }
    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: auth.id, date: today } },
      create: {
        employeeId: auth.id,
        date: today,
        checkIn: timeStr,
        checkInLat: latitude,
        checkInLng: longitude,
        status,
        notes: attendanceNote,
        source: "app",
      },
      update: {
        checkIn: timeStr,
        checkInLat: latitude,
        checkInLng: longitude,
        status,
        notes: attendanceNote,
        source: "app",
      }
    });

    // Log location for tracking map
    await prisma.locationLog.create({
      data: {
        employeeId: auth.id,
        latitude,
        longitude,
        isOutOfRange: false,
      }
    });
    
    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    let deviceName = "متصفح ويب";
    if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = "هاتف iOS / iPhone";
    else if (/android/i.test(userAgent)) deviceName = "هاتف Android";
    else if (/macintosh|mac os x/i.test(userAgent)) deviceName = "كمبيوتر Mac";
    else if (/windows/i.test(userAgent)) deviceName = "كمبيوتر Windows";

    // Notify admins about check-in (device type only visible to superadmin)
    const emp = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true, department: { select: { name: true } } } });
    const statusLabel = status === "late" ? "⚠️ متأخر" : "✅ في الوقت";
    await createAdminNotification({
      type: status === "late" ? "warning" : "success",
      category: "attendance",
      title: `${statusLabel} — ${emp?.name} سجّل حضوره`,
      body: `${emp?.name} (${emp?.department?.name || "موظف"}) — الدخول: ${timeStr} ${attendanceNote ? `[${attendanceNote}]` : ""}`,
      superAdminBody: `${emp?.name} (${emp?.department?.name || "موظف"}) — الدخول: ${timeStr} | الجهاز: ${deviceName} ${attendanceNote ? `[${attendanceNote}]` : ""}`,
      link: "/attendance",
    });
  } else {
    // Check out
    if (!existing?.checkIn) {
      return NextResponse.json({ error: "يجب تسجيل الحضور أولاً" }, { status: 400 });
    }
    if (existing?.checkOut) {
      return NextResponse.json({ error: "تم تسجيل انصرافك بالفعل اليوم" }, { status: 400 });
    }
    await prisma.attendance.update({
      where: { employeeId_date: { employeeId: auth.id, date: today } },
      data: {
        checkOut: timeStr,
        checkOutLat: latitude,
        checkOutLng: longitude,
      }
    });

    // Log location for tracking map
    await prisma.locationLog.create({
      data: {
        employeeId: auth.id,
        latitude,
        longitude,
        isOutOfRange: false,
      }
    });

    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    let deviceName = "متصفح ويب";
    if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = "هاتف iOS / iPhone";
    else if (/android/i.test(userAgent)) deviceName = "هاتف Android";
    else if (/macintosh|mac os x/i.test(userAgent)) deviceName = "كمبيوتر Mac";
    else if (/windows/i.test(userAgent)) deviceName = "كمبيوتر Windows";

    // Notify admins about check-out (device type only visible to superadmin)
    const emp = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true, department: { select: { name: true } } } });
    await createAdminNotification({
      type: "info",
      category: "attendance",
      title: `🚪 ${emp?.name} سجّل انصرافه`,
      body: `${emp?.name} (${emp?.department?.name || "موظف"}) — الانصراف: ${timeStr}`,
      superAdminBody: `${emp?.name} (${emp?.department?.name || "موظف"}) — الانصراف: ${timeStr} | الجهاز: ${deviceName}`,
      link: "/attendance",
    });
  }

  return NextResponse.json({ success: true, type, time: timeStr, status });
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
