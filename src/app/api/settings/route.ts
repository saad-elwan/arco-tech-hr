import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const settings = await prisma.company.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();
  const settings = await prisma.company.upsert({
    where: { id: 1 },
    update: {
      name: data.name,
      logo: data.logo,
      address: data.address,
      phone: data.phone,
      email: data.email,
      workStartTime: data.workStartTime,
      workEndTime: data.workEndTime,
      lateThresholdMin: data.lateThresholdMin ? parseInt(data.lateThresholdMin) : undefined,
      geofenceLat: data.geofenceLat != null ? parseFloat(data.geofenceLat) : undefined,
      geofenceLng: data.geofenceLng != null ? parseFloat(data.geofenceLng) : undefined,
      geofenceRadius: data.geofenceRadius ? parseInt(data.geofenceRadius) : undefined,
    },
    create: {
      id: 1,
      name: data.name || "شركتي",
      workStartTime: data.workStartTime || "08:00",
      workEndTime: data.workEndTime || "17:00",
      lateThresholdMin: data.lateThresholdMin || 15,
      geofenceLat: data.geofenceLat ? parseFloat(data.geofenceLat) : null,
      geofenceLng: data.geofenceLng ? parseFloat(data.geofenceLng) : null,
      geofenceRadius: data.geofenceRadius ? parseInt(data.geofenceRadius) : 500,
    },
  });
  return NextResponse.json(settings);
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request))
    return NextResponse.json({ error: "غير مصرح - يجب أن تكون مدير" }, { status: 403 });

  // Clear all data except company settings
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.locationLog.deleteMany(),
    prisma.advanceRequest.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.taskComment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.evaluation.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.department.deleteMany(),
  ]);

  return NextResponse.json({ success: true, message: "تم مسح جميع البيانات بنجاح" });
}
