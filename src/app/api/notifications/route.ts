import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

// GET /api/notifications → personalized for each user
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    if (auth.role === "employee") {
      // Employee: personal notifications from DB
      const notifs = await prisma.notification.findMany({
        where: { employeeId: auth.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const notifications = notifs.map(n => ({
        id: `notif-${n.id}`,
        title: n.title,
        desc: n.body,
        date: n.createdAt.toISOString(),
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        category: n.category,
      }));

      return NextResponse.json({ notifications, unreadCount: notifs.filter(n => !n.isRead).length });
    }

    // HR/Admin: system-level notifications (tasks, attendance anomalies, pending requests)
    const [recentTasks, recentAbsences, pendingAdvances, pendingLeaves] = await Promise.all([
      prisma.task.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { assignee: { select: { name: true } } }
      }),
      prisma.attendance.findMany({
        where: { status: { in: ["late", "absent"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { employee: { select: { name: true } } }
      }),
      prisma.advanceRequest.count({ where: { status: "pending" } }),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
    ]);

    const notifications = [
      ...(pendingAdvances > 0 ? [{
        id: "pending-advances",
        title: `📋 ${pendingAdvances} طلب سلفة قيد المراجعة`,
        desc: "انقر لمراجعة طلبات السلف",
        date: new Date().toISOString(),
        type: "warning",
        link: "/requests",
        isRead: false,
      }] : []),
      ...(pendingLeaves > 0 ? [{
        id: "pending-leaves",
        title: `📝 ${pendingLeaves} طلب إذن قيد المراجعة`,
        desc: "انقر لمراجعة طلبات الإذن",
        date: new Date().toISOString(),
        type: "info",
        link: "/requests",
        isRead: false,
      }] : []),
      ...recentTasks.map(t => ({
        id: `task-${t.id}`,
        title: `مهمة جديدة: ${t.title}`,
        desc: `تم التعيين إلى ${t.assignee.name}`,
        date: t.createdAt.toISOString(),
        type: "info",
        link: "/tasks",
        isRead: false,
      })),
      ...recentAbsences.map(a => ({
        id: `att-${a.id}`,
        title: `تنبيه حضور`,
        desc: `${a.employee.name} مسجل كـ ${a.status === "late" ? "متأخر" : "غائب"} يوم ${a.date}`,
        date: a.createdAt.toISOString(),
        type: a.status === "late" ? "warning" : "danger",
        link: "/attendance",
        isRead: false,
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    return NextResponse.json({ notifications, unreadCount: notifications.length });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/notifications → mark all as read
export async function PATCH(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (auth.role === "employee") {
    await prisma.notification.updateMany({
      where: { employeeId: auth.id, isRead: false },
      data: { isRead: true }
    });
  }

  return NextResponse.json({ success: true });
}
