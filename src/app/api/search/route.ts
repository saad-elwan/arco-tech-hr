import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Employees cannot use the global search
  if (!isHROrAdmin(request)) {
    return NextResponse.json({ results: [] });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } }
        ]
      },
      take: 5,
      select: { id: true, name: true, role: true, department: { select: { name: true } } }
    });

    const tasks = await prisma.task.findMany({
      where: { title: { contains: q } },
      take: 3,
      select: { id: true, title: true, status: true }
    });

    const results = [
      ...employees.map(e => ({ type: "employee", id: e.id, title: e.name, subtitle: e.department?.name || e.role, link: "/employees" })),
      ...tasks.map(t => ({ type: "task", id: t.id, title: t.title, subtitle: t.status === "new" ? "جديدة" : "قيد التنفيذ", link: "/tasks" }))
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
