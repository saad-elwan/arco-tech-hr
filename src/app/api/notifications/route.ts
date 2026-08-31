import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";

// GET /api/notifications → personalized for each user
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    // Delete any historical notifications related to Super Admin (Arco) login
    try {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { title: { contains: "تسجيل دخول مسؤول نظام" } },
            { body: { contains: "Arco" } },
            { body: { contains: "arco@arcotech.com" } }
          ]
        }
      });
    } catch {}

    // 1. Fetch personal notifications from DB for this user
    const dbNotifs = await prisma.notification.findMany({
      where: { 
        employeeId: auth.id,
        NOT: [
          { title: { contains: "تسجيل دخول مسؤول نظام" } },
          { body: { contains: "Arco" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const formattedDbNotifs = dbNotifs.map(n => ({
      id: `notif-${n.id}`,
      title: n.title,
      desc: n.body,
      body: n.body,
      message: n.body,
      date: n.createdAt.toISOString(),
      type: n.type,
      link: n.link,
      isRead: n.isRead,
      category: n.category,
    }));

    // If user is regular employee, return their DB notifications
    if (auth.role === "employee") {
      return NextResponse.json({
        notifications: formattedDbNotifs,
        unreadCount: formattedDbNotifs.filter(n => !n.isRead).length,
      });
    }

    // 2. For Admin / HR: Include system live alerts (pending requests, tasks, absences) if not already in DB
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

    const systemAlerts = [
      ...(pendingAdvances > 0 ? [{
        id: "pending-advances",
        title: "📋 طلبات سلف قيد المراجعة",
        desc: `يوجد ${pendingAdvances} طلب سلفة جديد بانتظار المراجعة والاعتماد`,
        body: `يوجد ${pendingAdvances} طلب سلفة جديد بانتظار المراجعة والاعتماد`,
        message: `يوجد ${pendingAdvances} طلب سلفة جديد بانتظار المراجعة والاعتماد`,
        date: new Date().toISOString(),
        type: "warning",
        link: "/requests",
        isRead: false,
      }] : []),
      ...(pendingLeaves > 0 ? [{
        id: "pending-leaves",
        title: "📝 طلبات إجازة وإذن قيد المراجعة",
        desc: `يوجد ${pendingLeaves} طلب إجازة أو إذن بانتظار موافقة الإدارة`,
        body: `يوجد ${pendingLeaves} طلب إجازة أو إذن بانتظار موافقة الإدارة`,
        message: `يوجد ${pendingLeaves} طلب إجازة أو إذن بانتظار موافقة الإدارة`,
        date: new Date().toISOString(),
        type: "info",
        link: "/requests",
        isRead: false,
      }] : []),
      ...recentTasks.map(t => ({
        id: `task-${t.id}`,
        title: `مهمة جديدة: ${t.title}`,
        desc: `تم تعيين المهمة للموظف ${t.assignee.name} بحالة ${t.status === "completed" ? "مكتملة" : "قيد التنفيذ"}`,
        body: `تم تعيين المهمة للموظف ${t.assignee.name} بحالة ${t.status === "completed" ? "مكتملة" : "قيد التنفيذ"}`,
        message: `تم تعيين المهمة للموظف ${t.assignee.name} بحالة ${t.status === "completed" ? "مكتملة" : "قيد التنفيذ"}`,
        date: t.createdAt.toISOString(),
        type: "info",
        link: "/tasks",
        isRead: false,
      })),
      ...recentAbsences.map(a => ({
        id: `att-${a.id}`,
        title: a.status === "late" ? "⏰ تنبيه تأخير موظف" : "❌ تنبيه غياب موظف",
        desc: `الموظف ${a.employee.name} مسجل كـ ${a.status === "late" ? "متأخر" : "غائب"} بتاريخ ${a.date}`,
        body: `الموظف ${a.employee.name} مسجل كـ ${a.status === "late" ? "متأخر" : "غائب"} بتاريخ ${a.date}`,
        message: `الموظف ${a.employee.name} مسجل كـ ${a.status === "late" ? "متأخر" : "غائب"} بتاريخ ${a.date}`,
        date: a.createdAt.toISOString(),
        type: a.status === "late" ? "warning" : "danger",
        link: "/attendance",
        isRead: false,
      }))
    ];

    // Combine DB notifications with system alerts
    const allNotifications = [...formattedDbNotifs, ...systemAlerts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    const unreadCount = formattedDbNotifs.filter(n => !n.isRead).length;

    return NextResponse.json({
      notifications: allNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/notifications → mark specific or all as read
export async function PATCH(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch {}

    if (body?.id) {
      const rawId = String(body.id).replace("notif-", "").replace("task-", "").replace("att-", "");
      const numId = parseInt(rawId);
      if (!isNaN(numId)) {
        await prisma.notification.updateMany({
          where: { id: numId, employeeId: auth.id },
          data: { isRead: true }
        });
      }
    } else {
      await prisma.notification.updateMany({
        where: { employeeId: auth.id, isRead: false },
        data: { isRead: true }
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error marking notifications read:", err);
    return NextResponse.json({ error: "خطأ في التحديث" }, { status: 500 });
  }
}
