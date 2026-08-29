import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fingerprint device webhook - receives data from biometric devices (ZKTeco, etc.)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    // Simple API key check - set this in your .env
    if (process.env.FINGERPRINT_API_KEY && apiKey !== process.env.FINGERPRINT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fingerprintId, timestamp, deviceId, action } = await request.json();

    if (!fingerprintId || !timestamp) {
      return NextResponse.json({ error: "fingerprintId and timestamp are required" }, { status: 400 });
    }

    // Find employee by fingerprint ID
    const employee = await prisma.employee.findUnique({
      where: { fingerprintId },
      include: { shift: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found for fingerprint ID: " + fingerprintId }, { status: 404 });
    }

    const ts = new Date(timestamp);
    const date = ts.toISOString().split("T")[0];
    const time = ts.toTimeString().substring(0, 5);

    // Find existing record for today
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date } },
    });

    const company = await prisma.company.findUnique({ where: { id: 1 } });
    const lateThreshold = company?.lateThresholdMin || 15;
    const workStart = company?.workStartTime || "08:00";

    let result;
    if (!existing) {
      // First punch = check in
      const [startH, startM] = workStart.split(":").map(Number);
      const [inH, inM] = time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const inMinutes = inH * 60 + inM;
      const isLate = inMinutes > startMinutes + lateThreshold;

      result = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date,
          checkIn: time,
          status: isLate ? "late" : "present",
          source: "fingerprint",
          notes: deviceId ? `Device: ${deviceId}` : null,
        },
      });

      return NextResponse.json({
        success: true,
        action: "checkin",
        employee: { id: employee.id, name: employee.name },
        status: isLate ? "late" : "present",
        time,
      });
    } else if (!existing.checkOut) {
      // Second punch = check out
      result = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkOut: time },
      });

      return NextResponse.json({
        success: true,
        action: "checkout",
        employee: { id: employee.id, name: employee.name },
        status: existing.status,
        time,
      });
    } else {
      return NextResponse.json({
        success: true,
        action: "already_complete",
        employee: { id: employee.id, name: employee.name },
        message: "Attendance already recorded for today",
      });
    }
  } catch (error) {
    console.error("Fingerprint webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
