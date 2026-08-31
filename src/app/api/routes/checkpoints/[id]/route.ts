import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const checkpointId = parseInt(id);

  const { status, notes } = await request.json(); // status: "visited" | "skipped" | "pending"

  const checkpoint = await prisma.routeCheckpoint.findUnique({
    where: { id: checkpointId },
    include: { route: true }
  });

  if (!checkpoint) {
    return NextResponse.json({ error: "نقطة التوقف غير موجودة" }, { status: 404 });
  }

  // Check if delegate owns this route or user is admin/hr
  if (auth.role !== "admin" && auth.role !== "hr" && auth.role !== "superadmin" && checkpoint.route.delegateId !== auth.id) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل هذا المسار" }, { status: 403 });
  }

  const updatedCheckpoint = await prisma.routeCheckpoint.update({
    where: { id: checkpointId },
    data: {
      status,
      notes: notes !== undefined ? notes : checkpoint.notes,
      visitedAt: status === "visited" ? new Date() : null,
    }
  });

  // Calculate route completion percentage & update route status if all visited
  const allCheckpoints = await prisma.routeCheckpoint.findMany({
    where: { routeId: checkpoint.routeId }
  });

  const visitedCount = allCheckpoints.filter(c => c.status === "visited").length;
  const totalCount = allCheckpoints.length;

  let newRouteStatus = "in_progress";
  if (visitedCount === totalCount && totalCount > 0) {
    newRouteStatus = "completed";
  }

  await prisma.dailyRoute.update({
    where: { id: checkpoint.routeId },
    data: { status: newRouteStatus }
  });

  return NextResponse.json({
    success: true,
    checkpoint: updatedCheckpoint,
    progress: {
      visited: visitedCount,
      total: totalCount,
      percentage: Math.round((visitedCount / totalCount) * 100)
    }
  });
}
