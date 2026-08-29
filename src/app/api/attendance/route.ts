import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (month) {
    where.date = { startsWith: month };
  } else {
    where.date = date;
  }
  if (employeeId) where.employeeId = parseInt(employeeId);
  if (status) where.status = status;

  const attendance = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          department: { select: { name: true } },
          shift: { select: { name: true, startTime: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { checkIn: "asc" }],
  });

  return NextResponse.json(attendance);
}

// Haversine formula
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { employeeId, date, checkIn, checkOut, status, notes, latitude, longitude } = body;

  // Mobile self-service check-in (employee checking themselves in)
  const isSelfService = !employeeId && auth;
  const targetEmployeeId = isSelfService ? auth.id : parseInt(employeeId);
  const targetDate = date || new Date().toISOString().split("T")[0];

  // For manual entry by HR/Admin (with explicit employeeId), require HR/Admin role
  if (!isSelfService && !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id: 1 } });
  const lateThreshold = company?.lateThresholdMin || 15;
  const workStart = company?.workStartTime || "08:00";

  // Determine check-in or check-out
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Check if record exists for today
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: targetEmployeeId, date: targetDate } },
  });

  const actualCheckIn = checkIn || (!existing ? currentTime : existing.checkIn);
  const actualCheckOut = checkOut || (existing && !existing.checkOut ? currentTime : undefined);

  let computedStatus = status || "present";
  if (actualCheckIn && !status) {
    const [startH, startM] = workStart.split(":").map(Number);
    const [inH, inM] = actualCheckIn.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const inMinutes = inH * 60 + inM;
    if (inMinutes > startMinutes + lateThreshold) {
      computedStatus = "late";
    }
  }

  // Calculate if out of geofence range
  let isOutOfRange = false;
  if (latitude != null && longitude != null && company?.geofenceLat != null && company?.geofenceLng != null) {
    const distance = haversineDistance(latitude, longitude, company.geofenceLat, company.geofenceLng);
    isOutOfRange = distance > (company.geofenceRadius || 500);
  }

  // Build location data
  const locationData: Record<string, unknown> = {};
  if (latitude != null && longitude != null) {
    if (!existing) {
      // Check-in: save check-in location
      locationData.checkInLat = latitude;
      locationData.checkInLng = longitude;
    } else if (!existing.checkOut) {
      // Check-out: save check-out location
      locationData.checkOutLat = latitude;
      locationData.checkOutLng = longitude;
    }
    locationData.isOutOfRange = isOutOfRange;
  }

  const source = isSelfService ? "app" : "manual";

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: targetEmployeeId, date: targetDate } },
    update: {
      ...(actualCheckOut ? { checkOut: actualCheckOut } : {}),
      ...(actualCheckIn && !existing ? { checkIn: actualCheckIn } : {}),
      status: computedStatus,
      notes,
      source,
      ...locationData,
    },
    create: {
      employeeId: targetEmployeeId,
      date: targetDate,
      checkIn: actualCheckIn,
      checkOut: actualCheckOut,
      status: computedStatus,
      source,
      notes,
      ...locationData,
    },
    include: { employee: { select: { name: true } } },
  });

  return NextResponse.json(record);
}
