import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

// GET: Retrieve out-of-range alerts for today
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (!isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");

    // Get company geofence for distance calculation
    const company = await prisma.company.findUnique({ where: { id: 1 } });

    // Get all out-of-range logs for the day
    const alerts = await prisma.locationLog.findMany({
      where: {
        isOutOfRange: true,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Calculate distance for each alert
    const alertsWithDistance = alerts.map((alert) => {
      let distance = null;
      if (company?.geofenceLat != null && company?.geofenceLng != null) {
        const R = 6371000;
        const dLat = ((alert.latitude - company.geofenceLat) * Math.PI) / 180;
        const dLng = ((alert.longitude - company.geofenceLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((company.geofenceLat * Math.PI) / 180) *
            Math.cos((alert.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = Math.round(R * c);
      }

      return {
        id: alert.id,
        employee: alert.employee,
        latitude: alert.latitude,
        longitude: alert.longitude,
        timestamp: alert.timestamp,
        distanceFromCompany: distance,
      };
    });

    // Also get attendance-based out-of-range records
    const attendanceAlerts = await prisma.attendance.findMany({
      where: {
        date,
        isOutOfRange: true,
      },
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

    return NextResponse.json({
      locationAlerts: alertsWithDistance,
      attendanceAlerts: attendanceAlerts.map((a) => ({
        id: a.id,
        employee: a.employee,
        type: "attendance",
        checkIn: a.checkIn,
        checkInLat: a.checkInLat,
        checkInLng: a.checkInLng,
        date: a.date,
      })),
      totalAlerts: alertsWithDistance.length + attendanceAlerts.length,
    });
  } catch (error) {
    console.error("Alerts fetch error:", error);
    return NextResponse.json(
      { error: "فشل في جلب التنبيهات" },
      { status: 500 }
    );
  }
}
