import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const data = await request.json();

  const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
  if (!task) return NextResponse.json({ error: "المهمة غير موجودة" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (data.status) {
    updateData.status = data.status;
    if (data.status === "completed") updateData.completedAt = new Date();
  }
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

  const updated = await prisma.task.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      assignee: { select: { name: true } },
      assigner: { select: { name: true } },
      comments: { include: { employee: { select: { name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth || (auth.role !== "admin" && auth.role !== "hr"))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.task.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
