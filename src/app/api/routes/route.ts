import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { ensureDatabaseSchema } from "@/lib/ensureSchema";

export async function GET(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const delegateId = searchParams.get("delegateId");

    const where: any = { date };

    // Non-admins can only see their own routes
    if (auth.role === "employee" || auth.role === "delegate") {
      where.delegateId = auth.id;
    } else if (delegateId) {
      where.delegateId = parseInt(delegateId);
    }

    const routes = await prisma.dailyRoute.findMany({
      where,
      include: {
        delegate: { select: { id: true, name: true, phone: true, department: { select: { name: true } } } },
        checkpoints: {
          orderBy: { order: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(routes || []);
  } catch (err) {
    console.error("Routes GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { delegateId, date, title, notes, checkpoints } = body;

    if (!delegateId || !title || !Array.isArray(checkpoints) || checkpoints.length === 0) {
      return NextResponse.json({ error: "يرجى تحديد المندوب وعنوان خط السير ونقطة توقف واحدة على الأقل" }, { status: 400 });
    }

    const routeDate = date || new Date().toISOString().split("T")[0];

    const createdRoute = await prisma.dailyRoute.create({
      data: {
        delegateId: parseInt(delegateId),
        date: routeDate,
        title,
        notes: notes || null,
        checkpoints: {
          create: checkpoints.map((cp: any, index: number) => ({
            clientName: cp.clientName || `عميل #${index + 1}`,
            address: cp.address || null,
            phone: cp.phone || null,
            lat: !isNaN(parseFloat(cp.lat)) ? parseFloat(cp.lat) : 30.0444,
            lng: !isNaN(parseFloat(cp.lng)) ? parseFloat(cp.lng) : 31.2357,
            order: cp.order || index + 1,
            status: "pending",
          }))
        }
      },
      include: {
        delegate: { select: { name: true } },
        checkpoints: { orderBy: { order: "asc" } }
      }
    });

    // Notify delegate
    try {
      await prisma.notification.create({
        data: {
          employeeId: parseInt(delegateId),
          title: "🚗 خط سير ميداني جديد",
          body: `تم تكليفك بخط سير جديد: "${title}" لتاريخ ${routeDate} (${checkpoints.length} نقاط زيارة)`,
          category: "task",
          type: "info",
          link: "/me",
          isRead: false,
        }
      });
    } catch {}

    return NextResponse.json({ success: true, route: createdRoute });
  } catch (err: any) {
    console.error("Route create error:", err);
    return NextResponse.json({ error: err.message || "تعذر حفظ خط السير في الخادم" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, delegateId, date, title, notes, checkpoints } = body;

    if (!id || !delegateId || !title) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    const routeId = parseInt(id);

    // Update main route
    const updatedRoute = await prisma.dailyRoute.update({
      where: { id: routeId },
      data: {
        delegateId: parseInt(delegateId),
        date: date || new Date().toISOString().split("T")[0],
        title,
        notes: notes || null,
      }
    });

    // If checkpoints array is provided, recreate checkpoints
    if (Array.isArray(checkpoints) && checkpoints.length > 0) {
      await prisma.routeCheckpoint.deleteMany({ where: { routeId } });
      await prisma.routeCheckpoint.createMany({
        data: checkpoints.map((cp: any, index: number) => ({
          routeId,
          clientName: cp.clientName || `عميل #${index + 1}`,
          address: cp.address || null,
          phone: cp.phone || null,
          lat: !isNaN(parseFloat(cp.lat)) ? parseFloat(cp.lat) : 30.0444,
          lng: !isNaN(parseFloat(cp.lng)) ? parseFloat(cp.lng) : 31.2357,
          order: cp.order || index + 1,
          status: cp.status || "pending",
          notes: cp.notes || null,
        }))
      });
    }

    const fullRoute = await prisma.dailyRoute.findUnique({
      where: { id: routeId },
      include: {
        delegate: { select: { name: true } },
        checkpoints: { orderBy: { order: "asc" } }
      }
    });

    return NextResponse.json({ success: true, route: fullRoute });
  } catch (err: any) {
    console.error("Route update error:", err);
    return NextResponse.json({ error: err.message || "تعذر تعديل خط السير" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await ensureDatabaseSchema();
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    let routeId = idParam ? parseInt(idParam) : null;

    if (!routeId) {
      const body = await request.json().catch(() => ({}));
      if (body?.id) routeId = parseInt(body.id);
    }

    if (!routeId) {
      return NextResponse.json({ error: "معرف خط السير مطلوب" }, { status: 400 });
    }

    await prisma.routeCheckpoint.deleteMany({ where: { routeId } });
    await prisma.dailyRoute.delete({ where: { id: routeId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Route delete error:", err);
    return NextResponse.json({ error: err.message || "تعذر حذف خط السير" }, { status: 500 });
  }
}
