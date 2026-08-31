import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";
import { createAdminNotification } from "@/lib/notifications";

// POST /api/attendance/checkin → employee self check-in/out
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { latitude, longitude, type } = body; // type: "in" | "out"

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "بيانات الموقع مطلوبة" }, { status: 400 });
  }

  // Get company geofence settings
  const company = await prisma.company.findFirst();
  if (company?.geofenceLat && company?.geofenceLng) {
    const dist = getDistance(latitude, longitude, company.geofenceLat, company.geofenceLng);
    const maxDist = 5; // 5 meters strict
    if (dist > maxDist) {
      return NextResponse.json({
        error: `أنت خارج نطاق الشركة (${Math.round(dist)} متر). يجب أن تكون داخل 5 أمتار.`
      }, { status: 400 });
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeStr = now.toTimeString().substring(0, 5);

  // Determine status
  let status = "present";
  if (type === "in" && company?.workStartTime) {
    const [wh, wm] = company.workStartTime.split(":").map(Number);
    const [ch, cm] = timeStr.split(":").map(Number);
    const workMinutes = wh * 60 + wm + (company.lateThresholdMin || 15);
    const checkInMinutes = ch * 60 + cm;
    if (checkInMinutes > workMinutes) status = "late";
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
        source: "app",
      },
      update: {
        checkIn: timeStr,
        checkInLat: latitude,
        checkInLng: longitude,
        status,
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
    
    // Notify admins about check-in
    const emp = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true, department: { select: { name: true } } } });
    const statusLabel = status === "late" ? "⚠️ متأخر" : "✅ في الوقت";
    await createAdminNotification({
      type: status === "late" ? "warning" : "success",
      category: "attendance",
      title: `${statusLabel} — ${emp?.name} سجّل حضوره`,
      body: `${emp?.name} (${emp?.department?.name || "غير محدد"}) — الدخول: ${timeStr}`,
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

    // Notify admins about check-out
    const empOut = await prisma.employee.findUnique({ where: { id: auth.id }, select: { name: true, department: { select: { name: true } } } });
    await createAdminNotification({
      type: "info",
      category: "attendance",
      title: `🚪 ${empOut?.name} سجّل انصرافه`,
      body: `${empOut?.name} (${empOut?.department?.name || "غير محدد"}) — الانصراف: ${timeStr}`,
      link: "/attendance",
    });
  }

  return NextResponse.json({ success: true });
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
