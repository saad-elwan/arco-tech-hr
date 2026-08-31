import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isSuperAdmin, isAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // Get active admin device sessions in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sessions = await prisma.adminDeviceSession.findMany({
    where: { lastSeen: { gte: since } },
    orderBy: { lastSeen: "desc" },
    take: 50,
  });

  return NextResponse.json({
    sessions,
    totalOnline: sessions.filter(s => (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000).length
  });
}

// Heartbeat & location update for admin device
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { lat, lng, deviceName, isLiveAudioActive } = await request.json();
  const userAgent = request.headers.get("user-agent") || "Web Browser";
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1";

  // Upsert or create device session
  const session = await prisma.adminDeviceSession.create({
    data: {
      adminId: auth.id,
      username: auth.name,
      ipAddress,
      userAgent,
      deviceName: deviceName || "جهاز إدارة رئيسي",
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      lastSeen: new Date(),
      isLiveAudioActive: !!isLiveAudioActive,
    }
  });

  return NextResponse.json({ success: true, session });
}
