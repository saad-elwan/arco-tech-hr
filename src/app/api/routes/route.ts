import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

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

  return NextResponse.json(routes);
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

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
          clientName: cp.clientName,
          address: cp.address || null,
          phone: cp.phone || null,
          lat: parseFloat(cp.lat),
          lng: parseFloat(cp.lng),
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

  return NextResponse.json({ success: true, route: createdRoute });
}
