import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isSuperAdmin, isAdmin } from "@/lib/middleware";
import { ensureDatabaseSchema } from "@/lib/ensureSchema";

export async function GET(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth || !isSuperAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح - هذه الصفحة مخصصة للمشرف العام فقط" }, { status: 403 });
  }

  try {
    let sessions: any[] = [];
    try {
      sessions = await prisma.adminDeviceSession.findMany({
        orderBy: { lastSeen: "desc" },
        take: 100,
      });
    } catch {
      sessions = [];
    }

    const adminAccounts = await prisma.employee.findMany({
      where: { role: { in: ["admin", "superadmin", "hr"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
        locationLogs: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        attendance: {
          orderBy: { createdAt: "desc" },
          take: 1,
        }
      }
    });

    // Augment sessions with recent locations from LocationLog/Attendance if admin has no device session GPS
    const synthesizedSessions: any[] = [...sessions];

    for (const adm of adminAccounts) {
      const hasSessionWithGps = sessions.some(s => (s.adminId === adm.id || s.username === adm.name) && s.lat && s.lng);
      if (!hasSessionWithGps) {
        let lat: number | null = null;
        let lng: number | null = null;
        let lastSeenDate = adm.updatedAt;

        if (adm.locationLogs && adm.locationLogs.length > 0) {
          lat = adm.locationLogs[0].latitude;
          lng = adm.locationLogs[0].longitude;
          lastSeenDate = adm.locationLogs[0].timestamp;
        } else if (adm.attendance && adm.attendance.length > 0 && adm.attendance[0].checkInLat) {
          lat = adm.attendance[0].checkInLat;
          lng = adm.attendance[0].checkInLng;
          lastSeenDate = adm.attendance[0].createdAt;
        }

        if (lat && lng) {
          synthesizedSessions.push({
            id: `synth-${adm.id}`,
            adminId: adm.id,
            username: adm.name,
            ipAddress: "مسجل من التطبيق",
            userAgent: "تطبيق ARCO HR الذكي",
            deviceName: "هاتف ذكي (Mobile GPS)",
            lat,
            lng,
            lastSeen: lastSeenDate,
            isLiveAudioActive: false,
          });
        }
      }
    }

    return NextResponse.json({
      sessions: synthesizedSessions,
      adminAccounts,
      totalOnline: synthesizedSessions.filter(s => (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000).length
    });
  } catch (err) {
    console.error("Devices GET error:", err);
    return NextResponse.json({ sessions: [], adminAccounts: [], totalOnline: 0 });
  }
}

// Heartbeat & location update for admin device
export async function POST(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { lat, lng, deviceName, isLiveAudioActive } = await request.json();
    const userAgent = request.headers.get("user-agent") || "Web Browser";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1";

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
  } catch (err: any) {
    console.error("Session create error:", err);
    return NextResponse.json({ success: true, warning: "Session not persisted" });
  }
}
