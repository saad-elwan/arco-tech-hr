import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const assignedTo = searchParams.get("assignedTo");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: Record<string, unknown> = {};
  if (auth.role === "employee") where.assignedTo = auth.id;
  else if (assignedTo) where.assignedTo = parseInt(assignedTo);
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { name: true, department: { select: { name: true } } } },
      assigner: { select: { name: true } },
      comments: {
        include: { employee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const auth = getAuthFromRequest(request);
  const { title, description, assignedTo, priority, dueDate } = await request.json();

  if (!title || !assignedTo) {
    return NextResponse.json({ error: "العنوان والموظف المكلف مطلوبان" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      assignedTo: parseInt(assignedTo),
      assignedBy: auth!.id,
      priority: priority || "medium",
      status: "new",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      assignee: { select: { name: true } },
      assigner: { select: { name: true } },
      comments: true,
    },
  });

  // Notify the assigned employee
  await createNotification({
    employeeId: parseInt(assignedTo),
    type: "info",
    category: "task",
    title: `📋 مهمة جديدة: ${title}`,
    body: `تم إسناد مهمة "${title}" إليك${dueDate ? ` — تاريخ التسليم: ${new Date(dueDate).toLocaleDateString("ar-EG")}` : ""}`,
    link: "/me",
  });

  return NextResponse.json(task);
}
