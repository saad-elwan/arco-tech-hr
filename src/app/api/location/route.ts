import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createAdminNotification } from "@/lib/notifications";

// Haversine formula to calculate distance between two GPS coordinates in meters
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST: Log employee/delegate location (called every 1 minute from mobile)
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { latitude, longitude } = await request.json();

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "الإحداثيات مطلوبة" },
        { status: 400 }
      );
    }

    // Get company geofence settings
    const company = await prisma.company.findUnique({ where: { id: 1 } });
    let isOutOfRange = false;

    if (company?.geofenceLat != null && company?.geofenceLng != null) {
      const distance = haversineDistance(
        latitude, longitude,
        company.geofenceLat, company.geofenceLng
      );
      isOutOfRange = distance > (company.geofenceRadius || 500);
    }

    const log = await prisma.locationLog.create({
      data: {
        employeeId: auth.id,
        latitude,
        longitude,
        isOutOfRange,
      },
    });

    // If employee just went out of range, notify admins
    if (isOutOfRange) {
      const emp = await prisma.employee.findUnique({
        where: { id: auth.id },
        select: { name: true, department: { select: { name: true } } },
      });
      const now = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      await createAdminNotification({
        type: "danger",
        category: "attendance",
        title: `🚨 ${emp?.name} خرج عن نطاق الشركة`,
        body: `${emp?.name} (${emp?.department?.name || "غير محدد"}) خرج عن النطاق الجغرافي الساعة ${now}`,
        link: "/tracking",
      });
    }

    return NextResponse.json({
      id: log.id,
      isOutOfRange,
      message: isOutOfRange ? "تحذير: أنت خارج نطاق الشركة" : "موقعك مسجل",
    });
  } catch (error) {
    console.error("Location log error:", error);
    return NextResponse.json(
      { error: "فشل في تسجيل الموقع" },
      { status: 500 }
    );
  }
}

// GET: Retrieve latest locations for all employees (for tracking map)
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Only HR/Admin can view all locations
  if (!isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const roleFilter = searchParams.get("role"); // "employee" | "delegate" | null (all)

  try {
    // Get all active employees
    const employeeWhere: Record<string, unknown> = { status: "active" };
    if (roleFilter) employeeWhere.role = roleFilter;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        department: { select: { name: true } },
      },
    });

    // Get the latest location log for each employee today
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    const latestLocations = await prisma.locationLog.findMany({
      where: {
        timestamp: { gte: startOfDay, lte: endOfDay },
        ...(roleFilter
          ? { employee: { role: roleFilter } }
          : {}),
      },
      orderBy: { timestamp: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Deduplicate: keep only the latest log per employee
    const seen = new Set<number>();
    const uniqueLocations = latestLocations.filter((log) => {
      if (seen.has(log.employeeId)) return false;
      seen.add(log.employeeId);
      return true;
    });

    // Get company geofence
    const company = await prisma.company.findUnique({ where: { id: 1 } });

    // Get today's attendance for context
    const todayAttendance = await prisma.attendance.findMany({
      where: { date },
      select: {
        employeeId: true,
        checkIn: true,
        checkOut: true,
        isOutOfRange: true,
        checkInLat: true,
        checkInLng: true,
      },
    });

    const attendanceMap = new Map(
      todayAttendance.map((a) => [a.employeeId, a])
    );

    // Get daily routes for this date
    const dailyRoutes = await prisma.dailyRoute.findMany({
      where: { date },
      include: {
        delegate: { select: { id: true, name: true, phone: true } },
        checkpoints: { orderBy: { order: "asc" } }
      }
    });

    // Count alerts
    const outOfRangeCount = uniqueLocations.filter((l) => l.isOutOfRange).length;

    return NextResponse.json({
      employees: employees.map((emp) => {
        const loc = uniqueLocations.find((l) => l.employeeId === emp.id);
        const att = attendanceMap.get(emp.id);
        return {
          ...emp,
          lastLocation: loc
            ? {
                latitude: loc.latitude,
                longitude: loc.longitude,
                isOutOfRange: loc.isOutOfRange,
                timestamp: loc.timestamp,
              }
            : null,
          attendance: att || null,
        };
      }),
      routes: dailyRoutes,
      geofence: company
        ? {
            lat: company.geofenceLat,
            lng: company.geofenceLng,
            radius: company.geofenceRadius,
          }
        : null,
      stats: {
        totalTracked: uniqueLocations.length,
        inRange: uniqueLocations.length - outOfRangeCount,
        outOfRange: outOfRangeCount,
        totalEmployees: employees.length,
        totalRoutes: dailyRoutes.length,
      },
    });
  } catch (error) {
    console.error("Location fetch error:", error);
    return NextResponse.json(
      { error: "فشل في جلب بيانات المواقع" },
      { status: 500 }
    );
  }
}
